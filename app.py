import json
import os

DATA_FILE = "tasks.json"

def load_tasks():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_tasks(tasks):
    with open(DATA_FILE, "w") as f:
        json.dump(tasks, f, indent=4)

def add_task(title):
    tasks = load_tasks()
    new_task = {
        "id": len(tasks) + 1,
        "title": title,
        "completed": False
    }
    tasks.append(new_task)
    save_tasks(tasks)
    print(f"Added task: '{title}'")

def list_tasks():
    tasks = load_tasks()
    if not tasks:
        print("No tasks found.")
        return
    for task in tasks:
        status = "[x]" if task["completed"] else "[ ]"
        print(f"{task['id']}. {status} {task['title']}")

def complete_task(task_id):
    tasks = load_tasks()
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = True
            save_tasks(tasks)
            print(f"Task {task_id} marked as complete.")
            return
    print(f"Task {task_id} not found.")

if __name__ == "__main__":
    while True:
        print("\n--- Local Task Manager ---")
        print("1. View tasks")
        print("2. Add task")
        print("3. Complete task")
        print("4. Exit")
        
        choice = input("Select an option (1-4): ").strip()
        
        if choice == "1":
            list_tasks()
        elif choice == "2":
            title = input("Enter task title: ").strip()
            if title:
                add_task(title)
        elif choice == "3":
            try:
                task_id = int(input("Enter task ID: "))
                complete_task(task_id)
            except ValueError:
                print("Please enter a valid number.")
        elif choice == "4":
            print("Exiting.")
            break
        else:
            print("Invalid choice, please select between 1 and 4.")
