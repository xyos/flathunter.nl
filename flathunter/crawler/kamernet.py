"""Expose crawler for Kamernet"""
import re

from flathunter.abstract_crawler import Crawler
from flathunter.logging import logger


def extract_id_from_url(url):
    id = url.split("/")[-1].replace("apartment-", "")
    return id


class Kamernet(Crawler):
    """Implementation of Crawler interface for Kamernet"""

    URL_PATTERN = re.compile(r"https://www\.kamernet\.nl")

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
        """Extracts all listings from a provided Soup object for Kamernet.nl"""
        entries = []

        # Find all listing elements in the HTML
        listings = soup.find_all(
            "a",
            {
                "class": "MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineNone MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation1 MuiCard-root"
            },
        )

        for listing in listings:
            base_url = "https://www.kamernet.nl"
            url_part = listing.find(
                "a",
                {
                    "class": "MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineNone MuiPaper-root MuiPaper-elevation MuiPaper-rounded MuiPaper-elevation1 MuiCard-root"
                },
            )["href"]

            url = base_url + url_part

            info_container = listing.find(
                "div", {"class": "MuiCardContent-root"})

            size = info_container.find_all("p")[0].text

            location_elements = info_container.find_all("h6")
            title = (
                location_elements[0].text.strip() + " " +
                location_elements[1].text.strip()
                if location_elements
                else ""
            )

            price_element = info_container.find("h5")
            price = price_element.text.strip() if price_element else ""
            listing_id = extract_id_from_url(url_part)

            image_element = listing.find(
                "img", {
                    "class": "MuiCardMedia-root MuiCardMedia-media MuiCardMedia-img"}
            )
            image = image_element["src"] if image_element and "src" in image_element.attrs else ""

            address = title

            details = {
                "id": listing_id,
                "url": url,
                "title": title,
                "image": image,
                "price": price,
                "energy_rating": "Not available",
                "size": size,
                "rooms": "Not available",
                "address": address,
                "crawler": self.get_name(),
            }

            entries.append(details)

        logger.debug("Number of entries found: %d", len(entries))

        return entries
