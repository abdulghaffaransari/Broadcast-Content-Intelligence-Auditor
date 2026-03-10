import os
import time
import logging
import requests
import yt_dlp
from azure.identity import DefaultAzureCredential

logger = logging.getLogger("video-indexer")


class VideoIndexerService:
    def __init__(self):
        self.account_id = os.getenv("AZURE_VI_ACCOUNT_ID")
        self.location = os.getenv("AZURE_VI_LOCATION")
        self.subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
        self.resource_group = os.getenv("AZURE_RESOURCE_GROUP")
        self.vi_name = os.getenv("AZURE_VI_NAME", "broadcast-ai-video-indexer")
        self.credential = DefaultAzureCredential()

    def get_access_token(self):
        """Generates an ARM Access Token."""
        try:
            token_object = self.credential.get_token("https://management.azure.com/.default")
            return token_object.token
        except Exception as e:
            logger.error(f"Failed to get Azure Token: {e}")
            raise

    def get_account_token(self, arm_access_token):
        """Exchanges ARM token for Video Indexer Account Token."""
        url = (
            f"https://management.azure.com/subscriptions/{self.subscription_id}"
            f"/resourceGroups/{self.resource_group}"
            f"/providers/Microsoft.VideoIndexer/accounts/{self.vi_name}"
            f"/generateAccessToken?api-version=2024-01-01"
        )
        headers = {"Authorization": f"Bearer {arm_access_token}"}
        payload = {"permissionType": "Contributor", "scope": "Account"}

        response = requests.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise Exception(f"Failed to get VI Account Token: {response.text}")

        return response.json().get("accessToken")

    def download_youtube_video(self, url, output_path="temp_video.mp4"):
        """Downloads a YouTube video to a local file."""
        logger.info(f"Downloading YouTube video: {url}")

        ydl_opts = {
            "format": "best",
            "outtmpl": output_path,
            "quiet": False,
            "no_warnings": False,
            "extractor_args": {"youtube": {"player_client": ["android", "web"]}},
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            logger.info("Download complete.")
            return output_path
        except Exception as e:
            raise Exception(f"YouTube Download Failed: {str(e)}")

    def upload_video(self, video_path, video_name):
        """Uploads a LOCAL FILE to Azure Video Indexer."""
        arm_token = self.get_access_token()
        vi_token = self.get_account_token(arm_token)

        api_url = f"https://api.videoindexer.ai/{self.location}/Accounts/{self.account_id}/Videos"

        params = {
            "accessToken": vi_token,
            "name": video_name,
            "privacy": "Private",
            "indexingPreset": "Default",
        }

        logger.info(f"Uploading file {video_path} to Azure...")

        with open(video_path, "rb") as video_file:
            files = {"file": video_file}
            response = requests.post(api_url, params=params, files=files)

        if response.status_code != 200:
            raise Exception(f"Azure Upload Failed: {response.text}")

        return response.json().get("id")

    def wait_for_processing(self, video_id):
        """Polls status until complete."""
        logger.info(f"Waiting for video {video_id} to process...")

        while True:
            arm_token = self.get_access_token()
            vi_token = self.get_account_token(arm_token)

            url = f"https://api.videoindexer.ai/{self.location}/Accounts/{self.account_id}/Videos/{video_id}/Index"
            params = {"accessToken": vi_token}
            response = requests.get(url, params=params)
            data = response.json()

            state = data.get("state")
            if state == "Processed":
                return data
            elif state == "Failed":
                raise Exception("Video Indexing Failed in Azure.")
            elif state == "Quarantined":
                raise Exception("Video Quarantined (Copyright/Content Policy Violation).")

            logger.info(f"Status: {state}... waiting 30s")
            time.sleep(30)

    def extract_data(self, vi_json):
        """
        Parses Azure Video Indexer JSON into our existing state format.

        Minimal goal-aligned upgrade:
        - Keep the same workflow and core fields
        - Add a few extra insight fields that help the auditor create
          a richer and more professional audit report
        """
        videos = vi_json.get("videos", [])
        summarized_insights = vi_json.get("summarizedInsights", {})

        transcript_lines = []
        ocr_lines = []

        for video in videos:
            insights = video.get("insights", {})

            for item in insights.get("transcript", []):
                text = item.get("text")
                if text:
                    transcript_lines.append(text)

            for item in insights.get("ocr", []):
                text = item.get("text")
                if text:
                    ocr_lines.append(text)

        # Minimal additional fields for richer audit reporting
        labels = []
        for item in summarized_insights.get("labels", []):
            name = item.get("name")
            if name:
                labels.append(name)

        keywords = []
        for item in summarized_insights.get("keywords", []):
            name = item.get("name")
            if name:
                keywords.append(name)

        topics = []
        for item in summarized_insights.get("topics", []):
            name = item.get("name")
            if name:
                topics.append(name)

        brands = []
        for item in summarized_insights.get("brands", []):
            name = item.get("name")
            if name:
                brands.append(name)

        faces = []
        for item in summarized_insights.get("faces", []):
            name = item.get("name")
            if name:
                faces.append(name)

        named_people = []
        for item in summarized_insights.get("namedPeople", []):
            name = item.get("name")
            if name:
                named_people.append(name)

        sentiments = []
        for item in summarized_insights.get("sentiments", []):
            sentiment_type = item.get("sentimentKey") or item.get("sentimentType") or item.get("averageKind")
            if sentiment_type:
                sentiments.append(sentiment_type)

        return {
            # Existing fields kept the same
            "transcript": " ".join(transcript_lines),
            "ocr_text": ocr_lines,
            "video_metadata": {
                "duration": summarized_insights.get("duration", {}).get("seconds"),
                "platform": "youtube",
            },
            # Minimal added fields for our richer audit goal
            "labels": labels,
            "keywords": keywords,
            "topics": topics,
            "brands": brands,
            "faces": faces,
            "named_people": named_people,
            "sentiments": sentiments,
        }