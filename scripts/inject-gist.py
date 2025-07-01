import requests

GIST_RAW_URL = "https://gist.githubusercontent.com/DOOYEE0709/<GIST_ID>/raw/"
README_PATH = "README.md"

START_TAG = "<!-- PRODUCTIVE_BOX_START -->"
END_TAG = "<!-- PRODUCTIVE_BOX_END -->"

def main():
    res = requests.get(GIST_RAW_URL)
    content = res.text.strip()

    with open(README_PATH, "r", encoding="utf-8") as f:
        readme = f.read()

    new_readme = readme.split(START_TAG)[0] + START_TAG + "\n```\n" + content + "\n```\n" + END_TAG + readme.split(END_TAG)[1]

    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(new_readme)

if __name__ == "__main__":
    main()
