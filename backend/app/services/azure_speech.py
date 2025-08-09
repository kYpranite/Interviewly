import requests

def issue_token(*, key: str, region: str | None, endpoint: str | None) -> str:
    """
    Issue a short-lived token for Azure Speech SDK browser clients.
    Uses endpoint if provided; otherwise falls back to region.
    """
    if not key or (not region and not endpoint):
        raise ValueError("Missing Azure config: require key and (region or endpoint)")

    if endpoint:
        base = endpoint.rstrip("/")
        url = f"{base}/sts/v1.0/issueToken"
    else:
        url = f"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"

    headers = {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/x-www-form-urlencoded",
    }
    resp = requests.post(url, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.text