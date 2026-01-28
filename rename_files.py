import os
import argparse
import sys

def rename_files(target_dir, find_char, replace_char):
    """
    Recursively walks through target_dir and renames files 
    by replacing 'find_char' with 'replace_char'.
    """
    if not os.path.isdir(target_dir):
        print(f"Error: Directory '{target_dir}' does not exist.")
        return

    count = 0
    # Walk top-down
    for root, dirs, files in os.walk(target_dir):
        for filename in files:
            if find_char in filename:
                new_filename = filename.replace(find_char, replace_char)
                old_path = os.path.join(root, filename)
                new_path = os.path.join(root, new_filename)
                
                try:
                    os.rename(old_path, new_path)
                    print(f"Renamed: '{filename}' -> '{new_filename}'")
                    count += 1
                except Exception as e:
                    print(f"Error renaming '{filename}': {e}")
    
    print(f"Finished. Renamed {count} files.")

def main():
    parser = argparse.ArgumentParser(description="Rename files by replacing characters.")
    parser.add_argument("directory", nargs='?', help="Target directory to scan")
    parser.add_argument("--find", help="Character(s) to find", default=None)
    parser.add_argument("--replace", help="Character(s) to replace with", default=None)
    
    args = parser.parse_args()
    
    # Interactive mode if arguments are missing
    target_path = args.directory
    if not target_path:
        target_path = input("Enter the directory to scan: ").strip()
        # Remove quotes if user added them (common in Windows)
        if (target_path.startswith('"') and target_path.endswith('"')) or \
           (target_path.startswith("'") and target_path.endswith("'")):
            target_path = target_path[1:-1]

    target_path = os.path.abspath(target_path)

    find_char = args.find
    if find_char is None:
        find_char = input("Enter character(s) to find (e.g. _): ")

    replace_char = args.replace
    if replace_char is None:
        replace_char = input("Enter replacement character(s) (e.g. space): ")
        # Handle "space" keyword or just take the input literal. 
        # The user request said "Ask the user what character(s) to remove / replace with".
        # If they hit enter (empty), we presumably replace with nothing (remove)?
        # Or if they type " " it is a space.
        # Let's trust literal input, but maybe handle empty input as empty string.

    print(f"\nConfiguration:")
    print(f"  Directory: {target_path}")
    print(f"  Find:      '{find_char}'")
    print(f"  Replace:   '{replace_char}'")
    
    confirm = input("\nProceed? (y/n): ").lower()
    if confirm != 'y':
        print("Operation cancelled.")
        return
    
    rename_files(target_path, find_char, replace_char)

if __name__ == "__main__":
    main()
