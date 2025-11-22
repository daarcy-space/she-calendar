from google_auth_oauthlib.flow import Flow

SCOPES = ["https://www.googleapis.com/auth/calendar"]

# Paste the *exact* "web" block from your downloaded JSON here:
CLIENT_CONFIG = {
    "web": {
        "client_id": "831518390260-44obqj2ja1ljjj29937uko99e05ipem5.apps.googleusercontent.com",
        "project_id": "she-calendar",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_secret": "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",
        "redirect_uris": [
            "http://localhost:8000/api/google/oauth2callback"
        ],
        "javascript_origins": [
            "http://localhost:5173"
        ]
    }
}


def build_flow() -> Flow:
    """
    Build a Google OAuth Flow object from the in-code client config.
    """
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
    )
    return flow
