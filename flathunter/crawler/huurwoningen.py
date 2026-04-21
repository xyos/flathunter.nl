"""Expose crawler for Huurwoningen"""
import re

from flathunter.abstract_crawler import Crawler
from flathunter.logging import logger


def extract_id_from_url(url):
    url_parts = url.split("/")
    id = url_parts[3] if len(url_parts) > 3 else None
    return int(id, base=10) if id else None


class Huurwoningen(Crawler):
    """Implementation of Crawler interface for Huurwoningen"""

    URL_PATTERN = re.compile(r"https://www\.huurwoningen\.nl")

    def __init__(self, config):
        super().__init__(config)
        self.config = config

    # pylint: disable=unused-argument
    def get_page(self, search_url, driver=None, page_no=None):
        """Applies a page number to a formatted search URL and fetches the exposes at that page"""
        if self.config.use_proxy():
            return self.get_soup_with_proxy(search_url)

        return self.get_soup_from_url(search_url)

    # pylint: disable=too-many-locals
    def extract_data(self, soup):
        """Extracts all listings from a provided Soup object for Huurwoningen.nl"""
        entries = []

        # Find all listing elements in the HTML
        listings = soup.find_all(
            "li", {"class": "search-list__item search-list__item--listing"})

        for listing in listings:
            title_element = listing.find(
                "a", {
                    "class": "listing-search-item__link listing-search-item__link--title"}
            )
            title = title_element.text.strip() if title_element else ""

            base_url = "https://www.huurwoningen.nl"
            url_part = listing.find(
                "a", {
                    "class": "listing-search-item__link listing-search-item__link--title"}
            )["href"]
            url = base_url + url_part
            listing_id = extract_id_from_url(url_part)

            image_element = listing.find("img", {"class": "picture__image"})
            image = image_element["src"] if image_element and "src" in image_element.attrs else ""

            price_element = listing.find(
                "div", {"class": "listing-search-item__price"})
            price = price_element.text.strip() if price_element else ""

            # Find the ul tag
            ul_tag = soup.find(
                "ul", class_="illustrated-features illustrated-features--compact")

            # Extract all li elements at once
            li_elements = ul_tag.find_all("li")
            # Extract the required information
            size = li_elements[0].get_text(strip=True) if len(
                li_elements) > 0 else "Not available"
            rooms = li_elements[1].get_text(strip=True) if len(
                li_elements) > 1 else "Not available"
            energy_rating = "Not available"
            address_element = listing.find(
                "div", {"class": "listing-search-item__sub-title'"})
            address = address_element.text.strip() if address_element else ""

            details = {
                "id": listing_id,
                "url": url,
                "title": title,
                "image": image,
                "price": price,
                # "energy_rating": energy_rating,
                "size": size,
                "rooms": rooms,
                "address": address,
                "crawler": self.get_name(),
            }

            entries.append(details)

        logger.debug("Number of entries found: %d", len(entries))

        return entries
