"""Expose crawler for Funda"""

import re
from urllib.parse import urljoin

from flathunter.abstract_crawler import Crawler
from flathunter.logging import logger


def extract_id_from_url(url):
    """Extracts the trailing digits (listing ID) from a Funda URL path."""
    match = re.search(r"/(\d+)/?$", url)
    return match.group(1) if match else None


class Funda(Crawler):
    """Implementation of Crawler interface for Funda"""

    URL_PATTERN = re.compile(r"https://www\.funda\.nl")
    BASE_URL = "https://www.funda.nl"

    def __init__(self, config):
        super().__init__(config)
        self.config = config

    # pylint: disable=unused-argument
    def get_page(self, search_url, driver=None, page_no=None):
        """Fetches the search results page using Playwright for full JS rendering"""
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                channel="chrome",
                args=["--disable-blink-features=AutomationControlled"],
            )
            context = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1920, "height": 1080},
                locale="nl-NL",
            )
            page = context.new_page()
            page.add_init_script(
                'Object.defineProperty(navigator, "webdriver", '
                "{ get: () => undefined });"
            )
            page.goto(search_url, wait_until="domcontentloaded", timeout=60000)
            try:
                page.wait_for_selector(
                    '[data-testid="listingDetailsAddress"]', timeout=30000
                )
            except Exception:
                logger.warning(
                    "Timed out waiting for listing elements on %s", search_url
                )
            html = page.content()
            browser.close()

        from bs4 import BeautifulSoup

        return BeautifulSoup(html, "lxml")

    # pylint: disable=too-many-locals
    def extract_data(self, soup):
        """Extracts all listings from a provided Soup object for Funda.nl"""
        entries = []

        address_links = soup.find_all(
            "a", attrs={"data-testid": "listingDetailsAddress"}
        )
        logger.debug("Found %d listing address links.", len(address_links))

        for addr in address_links:
            # --- URL and ID ---
            relative_url = addr.get("href")
            full_url = urljoin(self.BASE_URL, relative_url) if relative_url else ""
            listing_id = extract_id_from_url(relative_url) if relative_url else None

            # --- Street and postal/city ---
            street_el = addr.find("span", class_="truncate")
            title = street_el.get_text(strip=True) if street_el else "N/A"

            postal_el = addr.find(
                "div", class_=lambda c: c and "text-neutral-80" in c
            )
            address = (
                f"{title}, {postal_el.get_text(strip=True)}"
                if title != "N/A" and postal_el
                else title
            )

            # Navigate up: addr -> h2 -> info_div
            info_div = addr.parent.parent if addr.parent else None

            # --- Price ---
            price = "N/A"
            if info_div:
                for div in info_div.find_all(
                    "div", class_=lambda c: c and "font-semibold" in c
                ):
                    if "€" in div.get_text():
                        price = div.get_text(strip=True)
                        break

            # --- Specs (size, rooms, energy rating) ---
            size = "N/A"
            rooms = "N/A"
            energy_rating = "N/A"

            if info_div:
                specs_list = info_div.find("ul")
                if specs_list:
                    for item in specs_list.find_all("li"):
                        text = item.get_text(strip=True)
                        if "m²" in text and size == "N/A":
                            size = text
                        elif text.isdigit():
                            rooms = text
                        elif len(text) <= 3 and text.replace("+", "").isalpha():
                            energy_rating = text

            # --- Image ---
            image = ""
            if info_div:
                # Walk up to the @container outer div
                outer = info_div.parent.parent if info_div.parent else None
                if outer:
                    img_el = outer.find("img")
                    if img_el and img_el.get("src"):
                        image = img_el["src"]

            # --- Create Entry ---
            if not listing_id or not full_url:
                logger.warning(
                    "Skipping entry due to missing ID or URL. Title: %s", title
                )
                continue

            details = {
                "id": listing_id,
                "url": full_url,
                "title": title,
                "image": image,
                "price": price,
                "size": size,
                "rooms": rooms,
                "energy_rating": energy_rating,
                "address": address,
                "crawler": self.get_name(),
            }

            entries.append(details)

        logger.debug("Number of entries extracted: %d", len(entries))
        return entries

    def get_name(self):
        """Returns the name of the crawler."""
        return "Funda"
