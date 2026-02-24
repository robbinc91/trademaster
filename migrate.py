"""
Data Migration Script for TradeMaster Pro
Converts old format JSON (with name fields in items/saleItems) to new format (with productId references)

Usage: python migrate_data.py <input_file> <output_file>
Example: python migrate_data.py old_data.json new_data.json
"""

import json
import sys
import uuid
from datetime import datetime
from difflib import SequenceMatcher

def calculate_similarity(name1, name2):
    """Calculate similarity ratio between two strings using SequenceMatcher"""
    if not name1 or not name2:
        return 0
    return SequenceMatcher(None, name1.lower().strip(), name2.lower().strip()).ratio()

def find_or_create_product(name, products, product_map, similarity_threshold=0.85):
    """
    Find an existing product that matches the given name (using fuzzy matching)
    or create a new one if no match found
    """
    clean_name = name.strip() if name else "Unknown"
    
    # First try exact match (case-insensitive)
    lower_name = clean_name.lower()
    if lower_name in product_map:
        return product_map[lower_name]
    
    # Try fuzzy matching with existing products
    best_match = None
    best_score = 0
    
    for product_name, product_id in product_map.items():
        score = calculate_similarity(clean_name, product_name)
        if score > best_score and score >= similarity_threshold:
            best_score = score
            best_match = product_id
    
    if best_match:
        print(f"  Matched '{clean_name}' -> existing product (similarity: {best_score:.2f})")
        return best_match
    
    # No match found, create new product
    new_id = str(uuid.uuid4())
    new_product = {
        "id": new_id,
        "name": clean_name,
        "createdAt": datetime.now().isoformat()
    }
    products.append(new_product)
    product_map[lower_name] = new_id
    
    print(f"  Created new product: '{clean_name}' (id: {new_id[:8]}...)")
    return new_id

def migrate_data(old_data):
    """Migrate old format data to new format"""
    print("Starting migration...")
    print("=" * 50)
    
    # Initialize new data structure
    new_data = {
        "products": [],
        "items": [],
        "sales": [],
        "salesHistory": old_data.get("salesHistory", []),
        "settings": old_data.get("settings", {
            "currency": "USD",
            "language": "en",
            "lowStockThreshold": 10
        }),
        "lastUpdated": datetime.now().isoformat()
    }
    
    # Map for quick product lookup: lowercase_name -> product_id
    product_map = {}
    
    # Step 1: Collect all unique item names and create products
    print("\nStep 1: Processing items and creating products...")
    old_items = old_data.get("items", [])
    
    # Group items by name to see what we're working with
    name_groups = {}
    for item in old_items:
        name = item.get("name", "Unknown").strip() if item.get("name") else "Unknown"
        if name not in name_groups:
            name_groups[name] = []
        name_groups[name].append(item)
    
    print(f"Found {len(name_groups)} unique item names:")
    for name in sorted(name_groups.keys()):
        count = len(name_groups[name])
        print(f"  - '{name}' ({count} items)")
    
    print("\nStep 2: Creating products with fuzzy matching...")
    
    # Process items and create products
    for item in old_items:
        old_name = item.get("name", "Unknown").strip() if item.get("name") else "Unknown"
        
        # Find or create product
        product_id = find_or_create_product(old_name, new_data["products"], product_map)
        
        # Create new item without name, with productId
        new_item = {
            "id": item.get("id", str(uuid.uuid4())),
            "productId": product_id,
            "unit": item.get("unit", "pcs"),
            "buyPrice": item.get("buyPrice", 0),
            "sellPrice": item.get("sellPrice", 0),
            "quantity": item.get("quantity", 0),
            "minStock": item.get("minStock", 5),
            "maxStock": item.get("maxStock", 100),
            "location": item.get("location", ""),
            "description": item.get("description", ""),
            "dateAdded": item.get("dateAdded", datetime.now().isoformat()),
            "purchaseDate": item.get("purchaseDate") or item.get("dateAdded", datetime.now().isoformat()),
            "updatedAt": item.get("updatedAt", datetime.now().isoformat())
        }
        
        # Copy any additional fields that might exist
        for key in item:
            if key not in ["name", "id", "productId", "unit", "buyPrice", "sellPrice", 
                          "quantity", "minStock", "maxStock", "location", "description",
                          "dateAdded", "purchaseDate", "updatedAt"]:
                new_item[key] = item[key]
        
        new_data["items"].append(new_item)
    
    print(f"\nCreated {len(new_data['products'])} unique products")
    
    # Step 3: Process sales
    print("\nStep 3: Processing sales...")
    old_sales = old_data.get("sales", [])
    
    for sale in old_sales:
        new_sale_items = []
        
        for sale_item in sale.get("items", []):
            # Find the item to get its productId
            item_id = sale_item.get("itemId")
            item_name = sale_item.get("name", "Unknown")
            
            # Try to find matching item in new items
            matching_item = None
            for new_item in new_data["items"]:
                if new_item["id"] == item_id:
                    matching_item = new_item
                    break
            
            # If item not found by ID, try to find by product name
            if not matching_item and item_name:
                product_id = find_or_create_product(item_name, new_data["products"], product_map)
                # Find any item with this product
                for new_item in new_data["items"]:
                    if new_item["productId"] == product_id:
                        matching_item = new_item
                        break
            
            if matching_item:
                new_sale_item = {
                    "itemId": matching_item["id"],
                    "quantity": sale_item.get("quantity", 1),
                    "pricePerUnit": sale_item.get("pricePerUnit", 0),
                    "subtotal": sale_item.get("subtotal", 0)
                }
            else:
                # Create a placeholder item for orphaned sale items
                print(f"  Warning: Orphaned sale item '{item_name}' - creating placeholder")
                product_id = find_or_create_product(item_name, new_data["products"], product_map)
                placeholder_id = str(uuid.uuid4())
                placeholder_item = {
                    "id": placeholder_id,
                    "productId": product_id,
                    "unit": "pcs",
                    "buyPrice": 0,
                    "sellPrice": sale_item.get("pricePerUnit", 0),
                    "quantity": 0,
                    "minStock": 0,
                    "maxStock": 0,
                    "location": "",
                    "description": "Migrated from orphaned sale item",
                    "dateAdded": datetime.now().isoformat(),
                    "purchaseDate": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat()
                }
                new_data["items"].append(placeholder_item)
                
                new_sale_item = {
                    "itemId": placeholder_id,
                    "quantity": sale_item.get("quantity", 1),
                    "pricePerUnit": sale_item.get("pricePerUnit", 0),
                    "subtotal": sale_item.get("subtotal", 0)
                }
            
            new_sale_items.append(new_sale_item)
        
        new_sale = {
            "id": sale.get("id", str(uuid.uuid4())),
            "items": new_sale_items,
            "total": sale.get("total", 0),
            "paymentMethod": sale.get("paymentMethod", "cash"),
            "timestamp": sale.get("timestamp", datetime.now().isoformat()),
            "notes": sale.get("notes", "")
        }
        
        # Copy any additional fields
        for key in sale:
            if key not in ["id", "items", "total", "paymentMethod", "timestamp", "notes"]:
                new_sale[key] = sale[key]
        
        new_data["sales"].append(new_sale)
    
    print(f"Processed {len(new_data['sales'])} sales")
    
    # Summary
    print("\n" + "=" * 50)
    print("Migration Summary:")
    print(f"  - Products created: {len(new_data['products'])}")
    print(f"  - Items migrated: {len(new_data['items'])}")
    print(f"  - Sales migrated: {len(new_data['sales'])}")
    print(f"  - Sales history preserved: {len(new_data['salesHistory'])} entries")
    
    return new_data

def main():
    if len(sys.argv) < 3:
        print("Usage: python migrate_data.py <input_file> <output_file>")
        print("Example: python migrate_data.py old_data.json new_data.json")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    print(f"Reading input file: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            old_data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in '{input_file}': {e}")
        sys.exit(1)
    
    new_data = migrate_data(old_data)
    
    print(f"\nWriting output file: {output_file}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, indent=2, ensure_ascii=False)
    
    print("Migration complete!")
    print(f"\nYou can now import '{output_file}' into TradeMaster Pro")

if __name__ == "__main__":
    main()