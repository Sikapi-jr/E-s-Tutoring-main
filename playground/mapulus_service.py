# playground/mapulus_service.py
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


class MapulusGeocoder:
    """Service for geocoding addresses using Mapulus API"""

    BASE_URL = "https://api.mapulus.com/api/v1"

    def __init__(self):
        self.api_key = getattr(settings, 'MAPULUS_API_KEY', None)
        if not self.api_key or self.api_key == 'YOUR_MAPULUS_API_KEY_HERE':
            logger.warning("Mapulus API key not configured properly")

    def geocode_address(self, address, city, province="Ontario", country="Canada"):
        """
        Geocode an address using Mapulus API

        Args:
            address: Street address
            city: City name
            province: Province/state (default: Ontario)
            country: Country (default: Canada)

        Returns:
            dict with 'latitude', 'longitude', 'formatted_address' or None if failed
        """
        if not self.api_key or self.api_key == 'YOUR_MAPULUS_API_KEY_HERE':
            logger.error("Cannot geocode: Mapulus API key not configured")
            return None

        # Build full address string
        full_address = f"{address}, {city}, {province}, {country}"

        try:
            # Mapulus geocoding endpoint
            url = f"{self.BASE_URL}/geocode"

            params = {
                'api_key': self.api_key,
                'address': full_address,
                'format': 'json'
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            # Check if geocoding was successful
            if data.get('status') == 'OK' and data.get('results'):
                result = data['results'][0]
                location = result.get('geometry', {}).get('location', {})

                return {
                    'latitude': location.get('lat'),
                    'longitude': location.get('lng'),
                    'formatted_address': result.get('formatted_address', full_address)
                }
            else:
                logger.warning(f"Mapulus geocoding failed for address: {full_address}. Status: {data.get('status')}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Mapulus API request failed: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during geocoding: {e}")
            return None

    def add_marker_to_layer(self, layer_name, latitude, longitude, title, description="", metadata=None):
        """
        Add a marker to a specific Mapulus layer

        Args:
            layer_name: Name of the layer (e.g., 'tutors', 'parents')
            latitude: Marker latitude
            longitude: Marker longitude
            title: Marker title
            description: Marker description (optional)
            metadata: Additional metadata dict (optional)

        Returns:
            dict with marker info or None if failed
        """
        if not self.api_key or self.api_key == 'YOUR_MAPULUS_API_KEY_HERE':
            logger.error("Cannot add marker: Mapulus API key not configured")
            return None

        try:
            url = f"{self.BASE_URL}/markers"

            payload = {
                'api_key': self.api_key,
                'layer': layer_name,
                'latitude': latitude,
                'longitude': longitude,
                'title': title,
                'description': description,
                'metadata': metadata or {}
            }

            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data.get('status') == 'OK':
                logger.info(f"Marker added successfully to layer '{layer_name}': {title}")
                return data.get('marker')
            else:
                logger.warning(f"Failed to add marker to layer '{layer_name}': {data.get('message')}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Mapulus API request failed while adding marker: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error while adding marker: {e}")
            return None

    def get_layer_markers(self, layer_name):
        """
        Get all markers from a specific layer

        Args:
            layer_name: Name of the layer

        Returns:
            list of markers or empty list if failed
        """
        if not self.api_key or self.api_key == 'YOUR_MAPULUS_API_KEY_HERE':
            logger.error("Cannot get markers: Mapulus API key not configured")
            return []

        try:
            url = f"{self.BASE_URL}/markers"

            params = {
                'api_key': self.api_key,
                'layer': layer_name
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()

            if data.get('status') == 'OK':
                return data.get('markers', [])
            else:
                logger.warning(f"Failed to get markers from layer '{layer_name}': {data.get('message')}")
                return []

        except requests.exceptions.RequestException as e:
            logger.error(f"Mapulus API request failed while getting markers: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error while getting markers: {e}")
            return []


# Convenience function
def geocode_user_address(user):
    """Geocode a user's address and update their coordinates"""
    if not user.address or not user.city:
        logger.warning(f"User {user.id} missing address or city, skipping geocoding")
        return False

    geocoder = MapulusGeocoder()
    result = geocoder.geocode_address(user.address, user.city)

    if result:
        user.latitude = result['latitude']
        user.longitude = result['longitude']
        user.geocoded_address = result['formatted_address']
        user.save(update_fields=['latitude', 'longitude', 'geocoded_address'])
        logger.info(f"User {user.id} ({user.firstName} {user.lastName}) geocoded successfully")
        return True
    else:
        logger.warning(f"Failed to geocode user {user.id}")
        return False


def add_user_to_map(user):
    """Add user marker to appropriate Mapulus layer based on role"""
    if not user.latitude or not user.longitude:
        logger.warning(f"User {user.id} has no coordinates, cannot add to map")
        return False

    geocoder = MapulusGeocoder()

    # Determine layer based on role
    if user.roles == 'tutor':
        layer_name = 'tutors'
        title = f"Tutor: {user.firstName} {user.lastName}"
    elif user.roles == 'parent':
        layer_name = 'parents'
        title = f"Parent: {user.firstName} {user.lastName}"
    else:
        logger.info(f"User {user.id} role '{user.roles}' not mapped, skipping")
        return False

    metadata = {
        'user_id': user.id,
        'email': user.email,
        'city': user.city,
        'role': user.roles
    }

    description = f"{user.city} - {user.email}"

    result = geocoder.add_marker_to_layer(
        layer_name=layer_name,
        latitude=float(user.latitude),
        longitude=float(user.longitude),
        title=title,
        description=description,
        metadata=metadata
    )

    return result is not None
