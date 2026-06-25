import urllib.request
import zipfile
import os

url = "https://github.com/openziti/ziti-console/releases/latest/download/ziti-console.zip"
zip_path = "ziti-console.zip"
extract_path = "ziti-console"

if not os.path.exists(extract_path):
    os.makedirs(extract_path)

print(f"Downloading {url} to {zip_path}...")
urllib.request.urlretrieve(url, zip_path)
print("Downloaded successfully. Extracting...")

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_path)

print("Extraction complete!")
