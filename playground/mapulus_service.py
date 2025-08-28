"""
Mapulus API Service
Handles adding pins to external Mapulus map when users sign up
"""
import requests
import os
import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

class MapulusService:
    def __init__(self):
        self.api_key = 'mapulus_acc_S8onKrd47QHL5avHCf1iRnX4aCowPx'
        self.base_url = 'https://api.mapulus.com'
        
        # Ontario bounds for prioritizing addresses
        self.ontario_bounds = {
            'north': 56.9,
            'south': 41.7,
            'east': -74.3,
            'west': -95.2
        }
        
        # Pin color mapping
        self.role_colors = {
            'tutor': 'red',
            'parent': 'purple',
            'student': 'yellow'
        }
    
    def geocode_address(self, address: str, city: str) -> Optional[Dict]:
        """
        Geocode an address using Mapulus API with Ontario prioritization
        """
        try:
            # Format address with Ontario, Canada for better results
            full_address = f"{address}, {city}, Ontario, Canada"
            
            params = {
                'address': full_address,
                'key': self.api_key,
                'region': 'ca',
                'bounds': f"{self.ontario_bounds['south']},{self.ontario_bounds['west']}|{self.ontario_bounds['north']},{self.ontario_bounds['east']}"
            }
            
            response = requests.get(f"{self.base_url}/geocode", params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('results') and len(data['results']) > 0:
                location = data['results'][0]['geometry']['location']
                return {
                    'lat': location['lat'],
                    'lng': location['lng'],
                    'formatted_address': data['results'][0].get('formatted_address', full_address)
                }
            
            logger.warning(f"No geocoding results for address: {full_address}")
            return None
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Geocoding API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            return None
    
    def create_pin(self, user_data: Dict) -> bool:
        """
        Create a pin on the Mapulus map for a user
        """
        try:
            # Extract user data
            first_name = user_data.get('firstName', '')
            last_name = user_data.get('lastName', '')
            address = user_data.get('address', '')
            city = user_data.get('city', '')
            role = user_data.get('roles', '')
            user_id = user_data.get('id', '')
            
            # Validate required fields
            if not all([first_name, last_name, address, city, role]):
                logger.warning(f"Missing required fields for user {user_id}")
                return False
            
            # Geocode the address
            coords = self.geocode_address(address, city)
            if not coords:
                logger.error(f"Could not geocode address for user {user_id}: {address}, {city}")
                return False
            
            # Prepare pin data
            full_name = f"{first_name} {last_name}"
            pin_color = self.role_colors.get(role.lower(), 'blue')
            
            pin_data = {
                'name': full_name,
                'description': f"{role.capitalize()} in {city}",
                'latitude': coords['lat'],
                'longitude': coords['lng'],
                'color': pin_color,
                'address': coords.get('formatted_address', f"{address}, {city}"),
                'metadata': {
                    'user_id': user_id,
                    'role': role,
                    'city': city,
                    'signup_source': 'EGS_Tutoring'
                }
            }
            
            # Create pin via Mapulus API
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            }
            
            response = requests.post(
                f"{self.base_url}/pins",
                json=pin_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully created pin for {full_name} (ID: {user_id})")
                return True
            else:
                logger.error(f"Failed to create pin: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Mapulus API error: {e}")
            return False
        except Exception as e:
            logger.error(f"Pin creation error: {e}")
            return False
    
    def update_pin(self, user_data: Dict, pin_id: str = None) -> bool:
        """
        Update an existing pin on the Mapulus map
        """
        try:
            if not pin_id:
                # If no pin_id provided, try to find by user_id
                user_id = user_data.get('id')
                if not user_id:
                    return False
                pin_id = self.find_pin_by_user_id(user_id)
                if not pin_id:
                    return False
            
            # Similar logic to create_pin but for updates
            first_name = user_data.get('firstName', '')
            last_name = user_data.get('lastName', '')
            address = user_data.get('address', '')
            city = user_data.get('city', '')
            role = user_data.get('roles', '')
            
            coords = self.geocode_address(address, city)
            if not coords:
                return False
            
            full_name = f"{first_name} {last_name}"
            pin_color = self.role_colors.get(role.lower(), 'blue')
            
            update_data = {
                'name': full_name,
                'description': f"{role.capitalize()} in {city}",
                'latitude': coords['lat'],
                'longitude': coords['lng'],
                'color': pin_color,
                'address': coords.get('formatted_address', f"{address}, {city}")
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {self.api_key}'
            }
            
            response = requests.patch(
                f"{self.base_url}/pins/{pin_id}",
                json=update_data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully updated pin for {full_name}")
                return True
            else:
                logger.error(f"Failed to update pin: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Pin update error: {e}")
            return False
    
    def delete_pin(self, pin_id: str) -> bool:
        """
        Delete a pin from the Mapulus map
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }
            
            response = requests.delete(
                f"{self.base_url}/pins/{pin_id}",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully deleted pin {pin_id}")
                return True
            else:
                logger.error(f"Failed to delete pin: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Pin deletion error: {e}")
            return False
    
    def find_pin_by_user_id(self, user_id: str) -> Optional[str]:
        """
        Find a pin ID by user ID in metadata
        """
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}'
            }
            
            params = {
                'filter': f'metadata.user_id:{user_id}'
            }
            
            response = requests.get(
                f"{self.base_url}/pins",
                headers=headers,
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                pins = data.get('pins', [])
                if pins:
                    return pins[0].get('id')
            
            return None
            
        except Exception as e:
            logger.error(f"Pin search error: {e}")
            return None

# Singleton instance
mapulus_service = MapulusService()