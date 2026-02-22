# Node Field Guide - Quick Reference

## 🚀 START Node
**Purpose:** Entry point of your workflow

**Fields:**
- **Workflow Name:** Give your workflow a name (e.g., "Test API")
- **Description:** What does this workflow do? (optional)

**Example:**
```
Workflow Name: My First Workflow
Description: Test HTTP request to an API
```

---

## 🌐 HTTP Request Node
**Purpose:** Make HTTP requests to APIs or websites

**Fields:**
- **URL:** The full web address to call
  - Example: `https://jsonplaceholder.typicode.com/posts/1`
  - Example: `https://api.github.com/users/octocat`

- **Method:** Choose the HTTP method
  - `GET` - Retrieve data (most common)
  - `POST` - Send data to create something
  - `PUT` - Update existing data
  - `DELETE` - Remove data

- **Headers:** HTTP headers (optional, one per line)
  ```
  Content-Type: application/json
  Authorization: Bearer your-token-here
  ```

- **Body:** Data to send (for POST/PUT, usually JSON)
  ```json
  {
    "title": "Test",
    "body": "Hello world"
  }
  ```

**Quick Test Example:**
```
URL: https://jsonplaceholder.typicode.com/posts/1
Method: GET
Headers: (leave empty)
Body: (leave empty)
```
This will fetch a test post from a fake API.

---

## 🏁 END Node
**Purpose:** End point of your workflow

**Fields:**
- **Exit Code:** 0 = success, 1 = error
- **Message:** Final message (optional)

**Example:**
```
Exit Code: 0
Message: Workflow completed successfully!
```

---

## 🐍 Execute Python Node
**Purpose:** Run Python code

**Fields:**
- **Code:** Python code to execute
  ```python
  print("Hello from Python!")
  result = 2 + 2
  return result
  ```

- **Args:** Arguments to pass to the code (JSON format)
  ```json
  {"name": "John", "age": 30}
  ```

---

## 📁 Read File Node
**Purpose:** Read a file from disk

**Fields:**
- **File Path:** Full path to the file
  - Windows: `C:\Users\YourName\Documents\test.txt`
  - Or relative: `./data/input.txt`

- **Encoding:** Usually `utf-8` (for text files)

---

## ✍️ Write File Node
**Purpose:** Write data to a file

**Fields:**
- **File Path:** Where to save the file
  - Example: `C:\Users\YourName\Documents\output.txt`

- **Content:** What to write (can come from previous node)

- **Encoding:** Usually `utf-8`

- **Append:** Check this to add to file instead of overwriting

---

## ⏱️ Delay Node
**Purpose:** Wait before continuing

**Fields:**
- **Duration (ms):** How long to wait in milliseconds
  - 1000 = 1 second
  - 5000 = 5 seconds
  - 60000 = 1 minute

---

## 🔀 Condition Node
**Purpose:** Branch workflow based on condition

**Fields:**
- **Operator:** How to compare
  - `equals` - Exact match
  - `greater_than` - Number is bigger
  - `less_than` - Number is smaller
  - `contains` - Text contains substring

- **Comparison Value:** What to compare against

**Example:**
```
Operator: equals
Comparison Value: 200
```
(Checks if HTTP status code = 200)

---

## 🔄 Loop Node
**Purpose:** Repeat actions multiple times

**Fields:**
- **Loop Type:**
  - `foreach` - Loop through items in a list
  - `count` - Repeat X times
  - `while` - Repeat until condition is false

- **Max Iterations:** Safety limit (don't loop forever)
  - Example: 100

---

## 🖱️ Auto-Clicker Node
**Purpose:** Automated clicking with OCR

**Fields:**
- **Region X:** X coordinate of screen region
- **Region Y:** Y coordinate of screen region
- **Region Width:** Width of region to monitor
- **Region Height:** Height of region to monitor
- **Search Text:** Text to look for with OCR
- **Refresh Rate:** How often to check (milliseconds)
  - 1000 = check every 1 second
- **Max Iterations:** How many times to click (0 = infinite)
- **Click Button:** `left`, `right`, or `middle`

---

## 💻 Run Command Node
**Purpose:** Execute command line commands

**Fields:**
- **Command:** The command to run
  - Windows: `dir`, `notepad`, `python script.py`
  - PowerShell: `Get-Process`

- **Working Directory:** Where to run the command
  - Example: `C:\Users\YourName\Projects`

- **Timeout:** Max time to wait (milliseconds)
  - 30000 = 30 seconds

---

## 📊 Database Query Node
**Purpose:** Query a database

**Fields:**
- **Connection String:** Database connection
  - SQLite: `sqlite://./database.db`

- **Query:** SQL query to run
  ```sql
  SELECT * FROM users WHERE age > 18
  ```

---

## 🔔 Notification Node
**Purpose:** Show system notification

**Fields:**
- **Title:** Notification title
- **Message:** Notification text
- **Type:** `info`, `success`, `warning`, `error`

---

## 🧪 QUICK TEST WORKFLOW

**Try this simple workflow:**

1. **START Node:**
   ```
   Workflow Name: API Test
   Description: Test fetching data
   ```

2. **HTTP Request Node:**
   ```
   URL: https://jsonplaceholder.typicode.com/posts/1
   Method: GET
   Headers: (empty)
   Body: (empty)
   ```

3. **END Node:**
   ```
   Exit Code: 0
   Message: API request completed
   ```

**Connect them:** Start → HTTP Request → End

**Click Run** - Check System Logs for results!

---

## 💡 Pro Tips

**For testing:**
- Use JSONPlaceholder API: `https://jsonplaceholder.typicode.com/posts/1`
- Start simple with just Start → HTTP Request → End
- Check System Logs (Ctrl+L) for execution details

**Common mistakes:**
- Forgetting `https://` in URLs
- Wrong HTTP method (use GET for testing)
- Not connecting nodes properly

**Field not sure?**
- Leave it empty for defaults
- Most fields are optional except the main ones (URL, File Path, etc.)

---

**Need more help?** Tell me which node you're confused about!
