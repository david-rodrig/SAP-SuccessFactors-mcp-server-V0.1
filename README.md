# SuccessFactors MCP Server

An MCP (Model Context Protocol) server for interacting with SAP SuccessFactors OData API to retrieve and update employee/user data.

## Features

- **get_user_data**: Retrieve employee data with all specified fields
- **post_user_data**: Update employee/user information
- **get_user_statistics**: Get aggregate statistics about all users
 - **search_user_by_email**: Find users by email and return userId/firstName/lastName/email
- **manage_user_fields**: Get or update all 47 standard user fields (comprehensive field management)
- **get_complete_employee_data**: Retrieve complete employee data with all navigation properties (full OData entry)
- **get_manager_hr**: Retrieve manager and/or HR information
- **update_user_odata**: Update user data using the upsert endpoint with exact OData format (camelCase fields).
WARNING: This operation will modify employee data in the SAP SuccessFactors system. Changes cannot be automatically undone. 
- **update_manager_hr**: Update manager and/or HR assignments.
WARNING: This operation will modify employee data in the SAP SuccessFactors system. Changes cannot be automatically undone. 


## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Run the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Configuration

All sensitive configuration (API URL, username, and password) is stored in a `.env` file.

1. Copy the example file:
```bash
copy .env.example .env
```

2. Edit the `.env` file with your credentials:
```env
SF_API_URL=https://apisalesdemo2.successfactors.eu/odata/v2
SF_USERNAME=your-username-here
SF_PASSWORD=your-password-here
```

**Important:** The `.env` file is already in `.gitignore` and will not be committed to version control. Always keep your credentials secure!

## MCP Client Configuration

To use this server with an MCP client (like Claude Desktop), add it to your MCP configuration file:

```json
{
  "mcpServers": {
    "successfactors": {
      "command": "node",
      "args": ["C:\\Users\\Desktop\\SF-MCP-01\\dist\\index.js"]
    }
  }
}
```

## Available Tools

### get_user_data
### search_user_by_email

Search users by email and return basic identity info.

**Parameters:**
- `email` (required): Email address to search (exact match)

**Returns:** Array of matches with `userId`, `firstName`, `lastName`, and `email`.

Example request (OData): `GET /odata/v2/User?$filter=email eq 'user.email@example.com'`


Retrieves employee/user data from SuccessFactors.

**Parameters:**
- `userId` (required): User ID (USERID), Employee ID (EMPID), or Email address
- `fields` (optional): Array of specific fields to retrieve. If not provided, returns all standard fields.

**Returns:** JSON object with user data including:
- STATUS, USERID, USERNAME, FIRSTNAME, LASTNAME, MI, GENDER, EMAIL
- MANAGER, HR, DEPARTMENT, JOBCODE, DIVISION, LOCATION, TIMEZONE
- HIREDATE, EMPID, TITLE, BIZ_PHONE, FAX
- ADDR1, ADDR2, CITY, STATE, ZIP, COUNTRY
- REVIEW_FREQ, LAST_REVIEW_DATE
- CUSTOM01 through CUSTOM15
- MATRIX_MANAGER, DEFAULT_LOCALE, PROXY
- CUSTOM_MANAGER, SECOND_MANAGER, LOGIN_METHOD
- PERSON_GUID, PERSON_ID_EXTERNAL

### post_user_data

Updates employee/user data in SuccessFactors.

**Parameters:**
- `userId` (required): User ID to update
- `data` (required): Object containing key-value pairs of fields to update

**Returns:** Confirmation of successful update with updated fields list.

**Implementation detail:** This operation uses the SuccessFactors upsert endpoint: `POST /upsert?purgeType=record`.

### get_user_statistics

Retrieves aggregate statistics about all users.

**Parameters:**
- `filters` (optional): Object with filters for statistics

**Returns:** Statistics including:
- Total users count
- Active/inactive users
- Breakdown by gender, department, location, and status

### get_manager_hr

Retrieves manager and/or HR information for a specific user.

**Parameters:**
- `userId` (required): User ID (USERID), Employee ID (EMPID), or Email address to query
- `getManager` (optional): Whether to retrieve manager information (default: true)
- `getHR` (optional): Whether to retrieve HR information (default: true)

**Returns:** JSON object with:
- User ID information
- Manager details (userId, username, firstName, lastName, email) if requested
- HR details (userId, username, firstName, lastName, email) if requested
- null values if manager/HR is not assigned

### update_manager_hr

Updates manager and/or HR assignment for a user.

**Parameters:**
- `userId` (required): User ID to update
- `managerId` (optional): New manager User ID to assign (can be USERID, EMPID, or EMAIL)
- `hrId` (optional): New HR User ID to assign (can be USERID, EMPID, or EMAIL)

**Note:** At least one of `managerId` or `hrId` must be provided.

**Returns:** Confirmation of successful update with assigned manager/HR IDs.

### manage_user_fields

Get or update all standard user fields in SuccessFactors. This is a comprehensive tool that supports all 47 standard fields.

**Parameters:**
- `action` (required): Either `"get"` to retrieve fields or `"update"` to modify fields
- `userId` (required): User ID (USERID), Employee ID (EMPID), or Email address
- `fields` (optional):
  - For `"get"` action: Object specifying which fields to retrieve (keys are field names). If not provided, returns all fields.
  - For `"update"` action: **Required** - Object containing field names and values to update (e.g., `{"FIRSTNAME": "John", "LASTNAME": "Doe"}`)

**Supported Fields (all 47 fields):**
STATUS, USERID, USERNAME, FIRSTNAME, LASTNAME, MI, GENDER, EMAIL, MANAGER, HR, DEPARTMENT, JOBCODE, DIVISION, LOCATION, TIMEZONE, HIREDATE, EMPID, TITLE, BIZ_PHONE, FAX, ADDR1, ADDR2, CITY, STATE, ZIP, COUNTRY, REVIEW_FREQ, LAST_REVIEW_DATE, CUSTOM01 through CUSTOM15, MATRIX_MANAGER, DEFAULT_LOCALE, PROXY, CUSTOM_MANAGER, SECOND_MANAGER, LOGIN_METHOD, PERSON_GUID, PERSON_ID_EXTERNAL

**Returns:**
- For `"get"`: All requested fields with their current values (null if not set), plus list of all available fields
- For `"update"`: Confirmation with list of updated fields and their new values

**Implementation detail:** The `update` action uses the SuccessFactors upsert endpoint: `POST /upsert?purgeType=record`.

### get_complete_employee_data

Retrieve complete employee data with all fields and navigation properties. This returns the full OData entry as returned by SuccessFactors API, similar to fetching `User('empId')` directly. Useful for getting comprehensive employee information including all available navigation links and expanded properties.

**Parameters:**
- `userId` (required): User ID (USERID), Employee ID (EMPID), or Email address
- `expandProperties` (optional): Array of navigation properties to expand (e.g., `["personKeyNav", "manager", "hr", "empInfo"]`). If not provided, defaults to common properties: personKeyNav, manager, hr, empInfo, secondManager, matrixManager, customManager.
- `format` (optional): Response format - `"json"` (default) or `"xml"`. XML format returns the raw OData XML entry.

**Returns:**
- Complete employee data structure with all fields and navigation properties
- For JSON format: Structured object with completeData field containing all employee information
- For XML format: Raw OData XML entry (similar to the example provided)

### update_user_odata

Update user data using the SuccessFactors upsert endpoint with exact OData format matching SuccessFactors API. Accepts fields in camelCase format (firstName, lastName, email, status, timeZone, etc.) and automatically formats manager and HR with proper __metadata structure.

**Parameters:**
- `userId` (required): User ID to update (internal user ID)
- `username` (optional): Username (defaults to userId if not provided)
- `status` (optional): User status (e.g., "t" for active)
- `firstName` (optional): First name
- `lastName` (optional): Last name
- `gender` (optional): Gender (M/F)
- `email` (optional): Email address
- `department` (optional): Department
- `timeZone` (optional): Time zone (e.g., "US/Eastern", "Asia/Jerusalem")
- `managerId` (optional): Manager User ID, or "NO_MANAGER" to remove manager
- `hrId` (optional): HR User ID, or "NO_HR" to remove HR
- `additionalFields` (optional): Object with additional fields in camelCase format

**Returns:** Confirmation with the complete payload that was sent and the API response.

**Implementation detail:** This tool performs `POST /upsert?purgeType=record` with a `SFOData.User` payload.




## Notes
- WARNING - DEMONSTRATION PURPOSES ONLY
- This code is NOT PRODUCTION-READY and has been created solely for DEMONSTRATION AND TESTING PURPOSES.
- Do not use this in a live production environment.
- Before deploying to production, ensure proper development, testing, security review, and compliance with all relevant standards and regulations.
- WARNING: This operation will modify employee data in the SAP SuccessFactors system. Changes cannot be automatically undone. 
- The server uses Basic Authentication with the provided credentials

