#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
// Load .env file from project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });
// Configuration - Load from environment variables
const API_URL = process.env.SF_API_URL;
const USERNAME = process.env.SF_USERNAME;
const PASSWORD = process.env.SF_PASSWORD;
// Validate required environment variables
if (!API_URL || !USERNAME || !PASSWORD) {
    console.error('Error: Missing required environment variables!');
    console.error(`Please set SF_API_URL, SF_USERNAME, and SF_PASSWORD in your .env file`);
    console.error(`Looking for .env at: ${envPath}`);
    process.exit(1);
}
// Field mappings for user data
const USER_DATA_FIELDS = [
    'STATUS',
    'USERID',
    'USERNAME',
    'FIRSTNAME',
    'LASTNAME',
    'MI',
    'GENDER',
    'EMAIL',
    'MANAGER',
    'HR',
    'DEPARTMENT',
    'JOBCODE',
    'DIVISION',
    'LOCATION',
    'TIMEZONE',
    'HIREDATE',
    'EMPID',
    'TITLE',
    'BIZ_PHONE',
    'FAX',
    'ADDR1',
    'ADDR2',
    'CITY',
    'STATE',
    'ZIP',
    'COUNTRY',
    'REVIEW_FREQ',
    'LAST_REVIEW_DATE',
    'CUSTOM01',
    'CUSTOM02',
    'CUSTOM03',
    'CUSTOM04',
    'CUSTOM05',
    'CUSTOM06',
    'CUSTOM07',
    'CUSTOM08',
    'CUSTOM09',
    'CUSTOM10',
    'CUSTOM11',
    'CUSTOM12',
    'CUSTOM13',
    'CUSTOM14',
    'CUSTOM15',
    'MATRIX_MANAGER',
    'DEFAULT_LOCALE',
    'PROXY',
    'CUSTOM_MANAGER',
    'SECOND_MANAGER',
    'LOGIN_METHOD',
    'PERSON_GUID',
    'PERSON_ID_EXTERNAL',
];
// SuccessFactors OData Client
class SuccessFactorsClient {
    client;
    constructor(baseURL, username, password) {
        this.client = axios.create({
            baseURL,
            auth: {
                username,
                password,
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
    }
    async get(endpoint, params) {
        try {
            const response = await this.client.get(endpoint, { params });
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(`SuccessFactors API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Network Error: ${error.message}`);
        }
    }
    async post(endpoint, data) {
        try {
            const response = await this.client.post(endpoint, data);
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(`SuccessFactors API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Network Error: ${error.message}`);
        }
    }
    async patch(endpoint, data) {
        try {
            const response = await this.client.patch(endpoint, data);
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(`SuccessFactors API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Network Error: ${error.message}`);
        }
    }
    async put(endpoint, data) {
        try {
            const response = await this.client.put(endpoint, data);
            return response.data;
        }
        catch (error) {
            if (error.response) {
                throw new Error(`SuccessFactors API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            }
            throw new Error(`Network Error: ${error.message}`);
        }
    }
}
// Initialize client
const sfClient = new SuccessFactorsClient(API_URL, USERNAME, PASSWORD);
// Field name mapping from uppercase to camelCase (OData format)
const FIELD_NAME_MAP = {
    STATUS: 'status',
    USERID: 'userId',
    USERNAME: 'username',
    FIRSTNAME: 'firstName',
    LASTNAME: 'lastName',
    MI: 'mi',
    GENDER: 'gender',
    EMAIL: 'email',
    MANAGER: 'manager',
    HR: 'hr',
    DEPARTMENT: 'department',
    JOBCODE: 'jobCode',
    DIVISION: 'division',
    LOCATION: 'location',
    TIMEZONE: 'timeZone',
    HIREDATE: 'hireDate',
    EMPID: 'empId',
    TITLE: 'title',
    BIZ_PHONE: 'bizPhone',
    FAX: 'fax',
    ADDR1: 'addr1',
    ADDR2: 'addr2',
    CITY: 'city',
    STATE: 'state',
    ZIP: 'zip',
    COUNTRY: 'country',
    REVIEW_FREQ: 'reviewFreq',
    LAST_REVIEW_DATE: 'lastReviewDate',
    CUSTOM01: 'custom01',
    CUSTOM02: 'custom02',
    CUSTOM03: 'custom03',
    CUSTOM04: 'custom04',
    CUSTOM05: 'custom05',
    CUSTOM06: 'custom06',
    CUSTOM07: 'custom07',
    CUSTOM08: 'custom08',
    CUSTOM09: 'custom09',
    CUSTOM10: 'custom10',
    CUSTOM11: 'custom11',
    CUSTOM12: 'custom12',
    CUSTOM13: 'custom13',
    CUSTOM14: 'custom14',
    CUSTOM15: 'custom15',
    MATRIX_MANAGER: 'matrixManager',
    DEFAULT_LOCALE: 'defaultLocale',
    PROXY: 'proxy',
    CUSTOM_MANAGER: 'customManager',
    SECOND_MANAGER: 'secondManager',
    LOGIN_METHOD: 'loginMethod',
    PERSON_GUID: 'personGuid',
    PERSON_ID_EXTERNAL: 'personIdExternal',
};
// Helper function to convert field name to OData format
function toODataFieldName(fieldName) {
    const upperField = fieldName.toUpperCase();
    return FIELD_NAME_MAP[upperField] || fieldName;
}
// Helper function to prepare update payload with __metadata
function prepareUpdatePayload(userId, fields, baseUrl) {
    const payload = {
        __metadata: {
            uri: `User('${userId}')`,
            type: 'SFOData.User',
        },
        userId: userId,
        username: fields.USERNAME || userId, // Use provided username or default to userId
    };
    // Status is REQUIRED - must always be included
    if (fields.STATUS !== undefined) {
        payload.status = fields.STATUS;
    }
    // Add fields, converting to camelCase
    Object.keys(fields).forEach((key) => {
        const upperKey = key.toUpperCase();
        const oDataFieldName = toODataFieldName(key);
        // Skip fields we've already handled
        if (upperKey === 'USERID' || upperKey === 'USERNAME' || upperKey === 'STATUS') {
            return;
        }
        // Handle manager and HR specially
        if (upperKey === 'MANAGER') {
            if (fields[key] === null || fields[key] === 'NO_MANAGER' || fields[key] === '') {
                payload.manager = {
                    __metadata: {
                        uri: "User('NO_MANAGER')",
                    },
                };
            }
            else {
                payload.manager = {
                    __metadata: {
                        uri: `User('${fields[key]}')`,
                    },
                };
            }
        }
        else if (upperKey === 'HR') {
            if (fields[key] === null || fields[key] === 'NO_HR' || fields[key] === '') {
                payload.hr = {
                    __metadata: {
                        uri: "User('NO_HR')",
                    },
                };
            }
            else {
                payload.hr = {
                    __metadata: {
                        uri: `User('${fields[key]}')`,
                    },
                };
            }
        }
        else {
            // Regular field - use camelCase
            payload[oDataFieldName] = fields[key];
        }
    });
    return payload;
}
// Helper function to prepare upsert payload (for /upsert)
function prepareUpsertPayload(userId, fields) {
    const payload = {
        __metadata: {
            uri: `User('${userId}')`,
            type: 'SFOData.User',
        },
        userId: userId,
        username: fields.USERNAME || userId,
    };
    if (fields.STATUS !== undefined) {
        payload.status = fields.STATUS;
    }
    Object.keys(fields).forEach((key) => {
        const upperKey = key.toUpperCase();
        const oDataFieldName = toODataFieldName(key);
        if (upperKey === 'USERID' || upperKey === 'USERNAME' || upperKey === 'STATUS') {
            return;
        }
        if (upperKey === 'MANAGER') {
            if (fields[key] === null || fields[key] === 'NO_MANAGER' || fields[key] === '') {
                payload.manager = {
                    __metadata: { uri: "User('NO_MANAGER')" },
                };
            }
            else {
                payload.manager = {
                    __metadata: { uri: `User('${fields[key]}')` },
                };
            }
        }
        else if (upperKey === 'HR') {
            if (fields[key] === null || fields[key] === 'NO_HR' || fields[key] === '') {
                payload.hr = {
                    __metadata: { uri: "User('NO_HR')" },
                };
            }
            else {
                payload.hr = {
                    __metadata: { uri: `User('${fields[key]}')` },
                };
            }
        }
        else {
            payload[oDataFieldName] = fields[key];
        }
    });
    return payload;
}
// Helper function to extract user data from OData response
function extractUserData(odataResponse, userId) {
    const result = {};
    // Handle different response structures
    let userData = null;
    if (odataResponse.d?.results) {
        // Collection response
        userData = userId
            ? odataResponse.d?.results.find((u) => u.userId === userId || u.USERID === userId)
            : odataResponse.d?.results[0];
    }
    else if (odataResponse.d) {
        // Single entity response
        userData = odataResponse.d;
    }
    else {
        userData = odataResponse;
    }
    if (!userData) {
        return result;
    }
    // Extract all specified fields (case-insensitive matching)
    USER_DATA_FIELDS.forEach((field) => {
        const value = userData[field] || userData[field.toLowerCase()] || userData[field.toUpperCase()];
        if (value !== undefined && value !== null) {
            result[field] = value;
        }
    });
    // Also try to extract from nested structures
    if (userData.personKeyNav) {
        const person = userData.personKeyNav;
        USER_DATA_FIELDS.forEach((field) => {
            if (person[field] !== undefined && result[field] === undefined) {
                result[field] = person[field];
            }
        });
    }
    return result;
}
// MCP Server
class SuccessFactorsMCPServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'successfactors-mcp-server',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        this.setupErrorHandling();
    }
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'get_user_data',
                    description: 'Retrieve employee/user data from SuccessFactors. Returns specified fields for a user by USERID, EMPID, or EMAIL.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: 'User ID (USERID), Employee ID (EMPID), or Email address to query',
                            },
                            fields: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional: Specific fields to retrieve. If not provided, returns all standard fields.',
                            },
                        },
                        required: ['userId'],
                    },
                },
                {
                    name: 'search_user_by_email',
                    description: 'Search users by email and return basic identity info (userId, firstName, lastName, email).',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            email: {
                                type: 'string',
                                description: 'Email address to search (exact match)',
                            },
                        },
                        required: ['email'],
                    },
                },
                {
                    name: 'post_user_data',
                    description: 'Update or create employee/user data in SuccessFactors. Note: Creating new users may require additional permissions.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: 'User ID to update',
                            },
                            data: {
                                type: 'object',
                                description: 'User data fields to update (key-value pairs)',
                            },
                        },
                        required: ['userId', 'data'],
                    },
                },
                {
                    name: 'get_user_statistics',
                    description: 'Get aggregate statistics about all users in SuccessFactors (total count, active users, etc.)',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            filters: {
                                type: 'object',
                                description: 'Optional filters for statistics (e.g., {status: "A"})',
                            },
                        },
                    },
                },
                {
                    name: 'get_manager_hr',
                    description: 'Retrieve manager and/or HR information for a specific user in SuccessFactors.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: 'User ID (USERID), Employee ID (EMPID), or Email address to query',
                            },
                            getManager: {
                                type: 'boolean',
                                description: 'Whether to retrieve manager information (default: true)',
                                default: true,
                            },
                            getHR: {
                                type: 'boolean',
                                description: 'Whether to retrieve HR information (default: true)',
                                default: true,
                            },
                        },
                        required: ['userId'],
                    },
                },
                {
                    name: 'update_manager_hr',
                    description: 'Update manager and/or HR assignment for a user in SuccessFactors.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: 'User ID to update',
                            },
                            managerId: {
                                type: 'string',
                                description: 'Optional: New manager User ID to assign',
                            },
                            hrId: {
                                type: 'string',
                                description: 'Optional: New HR User ID to assign',
                            },
                        },
                        required: ['userId'],
                    },
                },
                {
                    name: 'manage_user_fields',
                    description: 'Get or update all standard user fields in SuccessFactors. Supports all 47 standard fields including STATUS, USERID, USERNAME, FIRSTNAME, LASTNAME, MI, GENDER, EMAIL, MANAGER, HR, DEPARTMENT, JOBCODE, DIVISION, LOCATION, TIMEZONE, HIREDATE, EMPID, TITLE, BIZ_PHONE, FAX, ADDR1, ADDR2, CITY, STATE, ZIP, COUNTRY, REVIEW_FREQ, LAST_REVIEW_DATE, CUSTOM01-CUSTOM15, MATRIX_MANAGER, DEFAULT_LOCALE, PROXY, CUSTOM_MANAGER, SECOND_MANAGER, LOGIN_METHOD, PERSON_GUID, and PERSON_ID_EXTERNAL.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            action: {
                                type: 'string',
                                enum: ['get', 'update'],
                                description: 'Action to perform: "get" to retrieve fields, "update" to modify fields',
                            },
                            userId: {
                                type: 'string',
                                description: 'User ID (USERID), Employee ID (EMPID), or Email address',
                            },
                            fields: {
                                type: 'object',
                                description: 'Required for "update" action: Object containing field names and values to update. Keys should be uppercase field names (e.g., {"FIRSTNAME": "John", "LASTNAME": "Doe"}). Optional for "get" action: specify which fields to retrieve, otherwise all fields are returned.',
                            },
                        },
                        required: ['action', 'userId'],
                    },
                },
                {
                    name: 'get_complete_employee_data',
                    description: 'Retrieve complete employee data with all fields and navigation properties (personKeyNav, manager, hr, empInfo, etc.). Returns the full OData entry as returned by SuccessFactors API, similar to fetching User(\'empId\') with all expansions.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: 'User ID (USERID), Employee ID (EMPID), or Email address',
                            },
                            expandProperties: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Optional: List of navigation properties to expand (e.g., ["personKeyNav", "manager", "hr", "empInfo"]). If not provided, will attempt to get common navigation properties.',
                            },
                            format: {
                                type: 'string',
                                enum: ['json', 'xml'],
                                default: 'json',
                                description: 'Response format: "json" (default) or "xml"',
                            },
                        },
                        required: ['userId'],
                    },
                },
                {
                    name: 'update_user_odata',
                    description: 'Update user data using PUT request with exact OData format. Accepts fields in camelCase format (matching SuccessFactors API format) such as firstName, lastName, email, status, timeZone, etc. Manager and HR should be provided as User IDs or "NO_MANAGER"/"NO_HR".',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: 'User ID to update (internal user ID)',
                            },
                            username: {
                                type: 'string',
                                description: 'Username (optional, defaults to userId if not provided)',
                            },
                            status: {
                                type: 'string',
                                description: 'User status (e.g., "t" for active)',
                            },
                            firstName: {
                                type: 'string',
                                description: 'First name',
                            },
                            lastName: {
                                type: 'string',
                                description: 'Last name',
                            },
                            gender: {
                                type: 'string',
                                description: 'Gender (M/F)',
                            },
                            email: {
                                type: 'string',
                                description: 'Email address',
                            },
                            department: {
                                type: 'string',
                                description: 'Department',
                            },
                            timeZone: {
                                type: 'string',
                                description: 'Time zone (e.g., "US/Eastern", "Asia/Jerusalem")',
                            },
                            managerId: {
                                type: 'string',
                                description: 'Manager User ID, or "NO_MANAGER" to remove manager',
                            },
                            hrId: {
                                type: 'string',
                                description: 'HR User ID, or "NO_HR" to remove HR',
                            },
                            additionalFields: {
                                type: 'object',
                                description: 'Additional fields in camelCase format (e.g., {"jobCode": "Employee", "location": "Israel"})',
                            },
                        },
                        required: ['userId'],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                switch (name) {
                    case 'get_user_data':
                        return await this.handleGetUserData(args);
                    case 'search_user_by_email':
                        return await this.handleSearchUserByEmail(args);
                    case 'post_user_data':
                        return await this.handlePostUserData(args);
                    case 'get_user_statistics':
                        return await this.handleGetUserStatistics(args);
                    case 'get_manager_hr':
                        return await this.handleGetManagerHR(args);
                    case 'update_manager_hr':
                        return await this.handleUpdateManagerHR(args);
                    case 'manage_user_fields':
                        return await this.handleManageUserFields(args);
                    case 'get_complete_employee_data':
                        return await this.handleGetCompleteEmployeeData(args);
                    case 'update_user_odata':
                        return await this.handleUpdateUserOData(args);
                    default:
                        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                }
            }
            catch (error) {
                throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error.message}`);
            }
        });
    }
    async handleSearchUserByEmail(args) {
        const { email } = args;
        try {
            const response = await sfClient.get('User', {
                $format: 'json',
                $filter: `email eq '${email}'`,
                $select: 'userId,firstName,lastName,email',
            });
            const results = (response.d?.results || []).map((u) => ({
                userId: u.userId || u.USERID,
                firstName: u.firstName || u.FIRSTNAME,
                lastName: u.lastName || u.LASTNAME,
                email: u.email || u.EMAIL,
            }));
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ query: { email }, count: results.length, results }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to search by email: ${error.message}`);
        }
    }
    async handleGetUserData(args) {
        const { userId, fields } = args;
        try {
            // Try to get user by USERID first
            let userData = null;
            let endpoint = `User('${userId}')`;
            try {
                const response = await sfClient.get(endpoint, {
                    $format: 'json',
                    $expand: 'personKeyNav',
                });
                userData = extractUserData(response, userId);
            }
            catch (error) {
                // If direct USERID lookup fails, try searching
                try {
                    const searchResponse = await sfClient.get('User', {
                        $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                        $format: 'json',
                        $expand: 'personKeyNav',
                    });
                    userData = extractUserData(searchResponse, userId);
                }
                catch (searchError) {
                    // Try EMPID lookup
                    try {
                        const empJobResponse = await sfClient.get('EmpJob', {
                            $filter: `EMPID eq '${userId}'`,
                            $format: 'json',
                        });
                        if (empJobResponse.d?.results?.length > 0) {
                            const empId = empJobResponse.d.results[0].userId;
                            const userResponse = await sfClient.get(`User('${empId}')`, {
                                $format: 'json',
                                $expand: 'personKeyNav',
                            });
                            userData = extractUserData(userResponse);
                        }
                    }
                    catch (empError) {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
            }
            if (!userData || Object.keys(userData).length === 0) {
                throw new Error(`No data found for user: ${userId}`);
            }
            // Filter fields if specified
            let filteredData = userData;
            if (fields && fields.length > 0) {
                filteredData = {};
                fields.forEach((field) => {
                    const upperField = field.toUpperCase();
                    if (userData[upperField] !== undefined) {
                        filteredData[upperField] = userData[upperField];
                    }
                });
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(filteredData, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, error.message);
        }
    }
    async handlePostUserData(args) {
        const { userId, data } = args;
        try {
            // First, find the user to get their internal ID
            let userEndpoint = `User('${userId}')`;
            try {
                // Try to get the user first
                await sfClient.get(userEndpoint, { $format: 'json' });
            }
            catch (error) {
                // User might not exist by USERID, try to find by other identifiers
                const searchResponse = await sfClient.get('User', {
                    $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                    $format: 'json',
                });
                if (searchResponse.d?.results?.length > 0) {
                    const foundUserId = searchResponse.d.results[0].userId || searchResponse.d.results[0].USERID;
                    userEndpoint = `User('${foundUserId}')`;
                }
                else {
                    throw new Error(`User not found: ${userId}`);
                }
            }
            // Get the actual user ID from endpoint
            const extractedUserId = userEndpoint.match(/User\('(.+?)'\)/)?.[1];
            const actualUserId = extractedUserId || userId;
            if (!actualUserId || actualUserId.trim() === '') {
                throw new Error(`Could not determine user ID from endpoint: ${userEndpoint}`);
            }
            // Fetch current user data to get required fields (like status)
            let currentUserData = null;
            try {
                const currentResponse = await sfClient.get(userEndpoint, {
                    $format: 'json',
                    $select: 'userId,username,status,firstName,lastName,gender,email,department,timeZone',
                });
                currentUserData = currentResponse.d || {};
            }
            catch (error) {
                // If we can't fetch current data, continue but status will be required from user
            }
            // Merge current data with update data (current data as defaults)
            const mergedData = {};
            // Include required fields from current user data
            if (currentUserData) {
                if (currentUserData.status)
                    mergedData.STATUS = currentUserData.status;
                if (currentUserData.username)
                    mergedData.USERNAME = currentUserData.username;
            }
            // Override with provided data
            Object.keys(data).forEach((key) => {
                mergedData[key.toUpperCase()] = data[key];
            });
            // Ensure status is always present (required field)
            if (!mergedData.STATUS && !currentUserData?.status) {
                throw new Error('Status field is required but not provided. Please include status in your update data.');
            }
            // Prepare upsert payload
            const updatePayload = prepareUpsertPayload(actualUserId, mergedData);
            // Upsert the user using POST to /upsert (minimal fields to avoid overwriting others)
            const result = await sfClient.post('upsert', updatePayload);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `User ${userId} updated successfully`,
                            updatedFields: Object.keys(data),
                            result,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to update user: ${error.message}`);
        }
    }
    async handleGetUserStatistics(args) {
        try {
            // Get all users
            const response = await sfClient.get('User', {
                $format: 'json',
                $inlinecount: 'allpages',
            });
            const users = response.d?.results || [];
            const totalCount = response.d?.__count || users.length;
            // Calculate statistics
            const statistics = {
                totalUsers: totalCount,
                activeUsers: 0,
                inactiveUsers: 0,
                byGender: {},
                byDepartment: {},
                byLocation: {},
                byStatus: {},
            };
            users.forEach((user) => {
                // Status
                const status = user.STATUS || user.status || 'Unknown';
                statistics.byStatus[status] = (statistics.byStatus[status] || 0) + 1;
                if (status === 'A' || status === 'Active') {
                    statistics.activeUsers++;
                }
                else {
                    statistics.inactiveUsers++;
                }
                // Gender
                const gender = user.GENDER || user.gender || 'Unknown';
                statistics.byGender[gender] = (statistics.byGender[gender] || 0) + 1;
                // Department
                const dept = user.DEPARTMENT || user.department || 'Unknown';
                statistics.byDepartment[dept] = (statistics.byDepartment[dept] || 0) + 1;
                // Location
                const location = user.LOCATION || user.location || 'Unknown';
                statistics.byLocation[location] = (statistics.byLocation[location] || 0) + 1;
            });
            // Apply filters if provided
            if (args.filters) {
                Object.keys(args.filters).forEach((key) => {
                    const filterValue = args.filters[key];
                    if (statistics[`by${key.charAt(0).toUpperCase() + key.slice(1)}`]) {
                        const filteredKey = `filtered_by_${key}`;
                        statistics[filteredKey] = statistics[`by${key.charAt(0).toUpperCase() + key.slice(1)}`][filterValue] || 0;
                    }
                });
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(statistics, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get statistics: ${error.message}`);
        }
    }
    async handleGetManagerHR(args) {
        const { userId, getManager = true, getHR = true } = args;
        try {
            // First, find the actual user ID (internal ID)
            let actualUserId = null;
            // Try direct lookup
            try {
                const directResponse = await sfClient.get(`User('${userId}')`, {
                    $format: 'json',
                    $select: 'userId',
                });
                actualUserId = directResponse.d?.userId || directResponse.d?.USERID || userId;
            }
            catch (error) {
                // Try searching by USERID, EMPID, or EMAIL
                try {
                    const searchResponse = await sfClient.get('User', {
                        $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                        $format: 'json',
                        $select: 'userId,USERID',
                    });
                    if (searchResponse.d?.results?.length > 0) {
                        actualUserId = searchResponse.d.results[0].userId || searchResponse.d.results[0].USERID;
                    }
                    else {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
                catch (searchError) {
                    throw new Error(`User not found: ${userId}`);
                }
            }
            if (!actualUserId) {
                throw new Error(`Could not determine user ID for: ${userId}`);
            }
            const result = {
                userId: actualUserId,
                requestedUserId: userId,
            };
            // Build OData query parameters
            const expandParams = [];
            const selectParams = ['userId'];
            if (getManager) {
                expandParams.push('manager');
                selectParams.push('manager/userId');
            }
            if (getHR) {
                expandParams.push('hr');
                selectParams.push('hr/userId');
            }
            const params = {
                $format: 'json',
                $filter: `userId eq '${actualUserId}'`,
                $select: selectParams.join(','),
            };
            if (expandParams.length > 0) {
                params.$expand = expandParams.join(',');
            }
            // Fetch user with manager and/or HR
            const response = await sfClient.get('User', params);
            const userData = response.d?.results?.[0] || response.d;
            if (!userData) {
                throw new Error(`No data found for user: ${userId}`);
            }
            // Extract manager information
            if (getManager && userData.manager) {
                result.manager = {
                    userId: userData.manager.userId || userData.manager.USERID,
                    username: userData.manager.username || userData.manager.USERNAME,
                    firstName: userData.manager.firstName || userData.manager.FIRSTNAME,
                    lastName: userData.manager.lastName || userData.manager.LASTNAME,
                    email: userData.manager.email || userData.manager.EMAIL,
                };
            }
            // Extract HR information
            if (getHR && userData.hr) {
                result.hr = {
                    userId: userData.hr.userId || userData.hr.USERID,
                    username: userData.hr.username || userData.hr.USERNAME,
                    firstName: userData.hr.firstName || userData.hr.FIRSTNAME,
                    lastName: userData.hr.lastName || userData.hr.LASTNAME,
                    email: userData.hr.email || userData.hr.EMAIL,
                };
            }
            // If manager or HR is null/undefined, indicate it
            if (getManager && !result.manager) {
                result.manager = null;
            }
            if (getHR && !result.hr) {
                result.hr = null;
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get manager/HR: ${error.message}`);
        }
    }
    async handleUpdateManagerHR(args) {
        const { userId, managerId, hrId } = args;
        try {
            if (!managerId && !hrId) {
                throw new Error('At least one of managerId or hrId must be provided');
            }
            // First, find the actual user ID (internal ID)
            let actualUserId = null;
            try {
                const directResponse = await sfClient.get(`User('${userId}')`, {
                    $format: 'json',
                    $select: 'userId',
                });
                actualUserId = directResponse.d?.userId || directResponse.d?.USERID || userId;
            }
            catch (error) {
                // Try searching by USERID, EMPID, or EMAIL
                try {
                    const searchResponse = await sfClient.get('User', {
                        $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                        $format: 'json',
                        $select: 'userId,USERID',
                    });
                    if (searchResponse.d?.results?.length > 0) {
                        actualUserId = searchResponse.d.results[0].userId || searchResponse.d.results[0].USERID;
                    }
                    else {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
                catch (searchError) {
                    throw new Error(`User not found: ${userId}`);
                }
            }
            // Find manager ID if provided
            let actualManagerId = null;
            if (managerId) {
                try {
                    const managerResponse = await sfClient.get(`User('${managerId}')`, {
                        $format: 'json',
                        $select: 'userId',
                    });
                    actualManagerId = managerResponse.d?.userId || managerResponse.d?.USERID || managerId;
                }
                catch (error) {
                    try {
                        const searchManagerResponse = await sfClient.get('User', {
                            $filter: `USERID eq '${managerId}' or EMPID eq '${managerId}' or EMAIL eq '${managerId}'`,
                            $format: 'json',
                            $select: 'userId,USERID',
                        });
                        if (searchManagerResponse.d?.results?.length > 0) {
                            actualManagerId =
                                searchManagerResponse.d.results[0].userId ||
                                    searchManagerResponse.d.results[0].USERID;
                        }
                        else {
                            throw new Error(`Manager user not found: ${managerId}`);
                        }
                    }
                    catch (searchError) {
                        throw new Error(`Manager user not found: ${managerId}`);
                    }
                }
            }
            // Find HR ID if provided
            let actualHRId = null;
            if (hrId) {
                try {
                    const hrResponse = await sfClient.get(`User('${hrId}')`, {
                        $format: 'json',
                        $select: 'userId',
                    });
                    actualHRId = hrResponse.d?.userId || hrResponse.d?.USERID || hrId;
                }
                catch (error) {
                    try {
                        const searchHRResponse = await sfClient.get('User', {
                            $filter: `USERID eq '${hrId}' or EMPID eq '${hrId}' or EMAIL eq '${hrId}'`,
                            $format: 'json',
                            $select: 'userId,USERID',
                        });
                        if (searchHRResponse.d?.results?.length > 0) {
                            actualHRId =
                                searchHRResponse.d.results[0].userId || searchHRResponse.d.results[0].USERID;
                        }
                        else {
                            throw new Error(`HR user not found: ${hrId}`);
                        }
                    }
                    catch (searchError) {
                        throw new Error(`HR user not found: ${hrId}`);
                    }
                }
            }
            // Prepare update payload in OData format with __metadata
            const updateFields = {};
            if (actualManagerId) {
                updateFields.MANAGER = actualManagerId;
            }
            if (actualHRId) {
                updateFields.HR = actualHRId;
            }
            if (!actualUserId || actualUserId.trim() === '') {
                throw new Error(`Could not determine user ID for: ${userId}`);
            }
            const userEndpoint = `User('${actualUserId}')`;
            const updatePayload = prepareUpsertPayload(actualUserId, updateFields);
            // Upsert the user using POST to /upsert
            const result = await sfClient.post('upsert', updatePayload);
            const updatedFields = [];
            if (managerId)
                updatedFields.push('manager');
            if (hrId)
                updatedFields.push('hr');
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `User ${userId} updated successfully`,
                            updatedFields,
                            managerId: actualManagerId || 'not changed',
                            hrId: actualHRId || 'not changed',
                            result,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to update manager/HR: ${error.message}`);
        }
    }
    async handleManageUserFields(args) {
        const { action, userId, fields } = args;
        try {
            if (action === 'get') {
                // Get user fields
                let userData = null;
                let endpoint = `User('${userId}')`;
                try {
                    const response = await sfClient.get(endpoint, {
                        $format: 'json',
                        $expand: 'personKeyNav',
                    });
                    userData = extractUserData(response, userId);
                }
                catch (error) {
                    // If direct USERID lookup fails, try searching
                    try {
                        const searchResponse = await sfClient.get('User', {
                            $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                            $format: 'json',
                            $expand: 'personKeyNav',
                        });
                        userData = extractUserData(searchResponse, userId);
                    }
                    catch (searchError) {
                        // Try EMPID lookup
                        try {
                            const empJobResponse = await sfClient.get('EmpJob', {
                                $filter: `EMPID eq '${userId}'`,
                                $format: 'json',
                            });
                            if (empJobResponse.d?.results?.length > 0) {
                                const empId = empJobResponse.d.results[0].userId;
                                const userResponse = await sfClient.get(`User('${empId}')`, {
                                    $format: 'json',
                                    $expand: 'personKeyNav',
                                });
                                userData = extractUserData(userResponse);
                            }
                        }
                        catch (empError) {
                            throw new Error(`User not found: ${userId}`);
                        }
                    }
                }
                if (!userData || Object.keys(userData).length === 0) {
                    throw new Error(`No data found for user: ${userId}`);
                }
                // Filter fields if specified
                let filteredData = userData;
                if (fields && Object.keys(fields).length > 0) {
                    filteredData = {};
                    Object.keys(fields).forEach((field) => {
                        const upperField = field.toUpperCase();
                        if (USER_DATA_FIELDS.includes(upperField)) {
                            if (userData[upperField] !== undefined) {
                                filteredData[upperField] = userData[upperField];
                            }
                        }
                    });
                }
                // Ensure all allowed fields are represented (with null if not present)
                const result = {};
                USER_DATA_FIELDS.forEach((field) => {
                    result[field] = filteredData[field] ?? null;
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                userId,
                                fields: result,
                                availableFields: USER_DATA_FIELDS,
                            }, null, 2),
                        },
                    ],
                };
            }
            else if (action === 'update') {
                // Update user fields
                if (!fields || Object.keys(fields).length === 0) {
                    throw new Error('Fields object is required for update action');
                }
                // First, find the user to get their internal ID
                let userEndpoint = `User('${userId}')`;
                try {
                    await sfClient.get(userEndpoint, { $format: 'json' });
                }
                catch (error) {
                    // User might not exist by USERID, try to find by other identifiers
                    const searchResponse = await sfClient.get('User', {
                        $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                        $format: 'json',
                    });
                    if (searchResponse.d?.results?.length > 0) {
                        const foundUserId = searchResponse.d.results[0].userId || searchResponse.d.results[0].USERID;
                        userEndpoint = `User('${foundUserId}')`;
                    }
                    else {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
                // Validate and prepare update data
                const updateData = {};
                const invalidFields = [];
                Object.keys(fields).forEach((key) => {
                    const upperKey = key.toUpperCase();
                    if (USER_DATA_FIELDS.includes(upperKey)) {
                        updateData[upperKey] = fields[key];
                    }
                    else {
                        invalidFields.push(key);
                    }
                });
                if (invalidFields.length > 0) {
                    throw new Error(`Invalid fields: ${invalidFields.join(', ')}. Allowed fields: ${USER_DATA_FIELDS.join(', ')}`);
                }
                if (Object.keys(updateData).length === 0) {
                    throw new Error('No valid fields to update');
                }
                // Get the actual user ID from endpoint
                const extractedUserId = userEndpoint.match(/User\('(.+?)'\)/)?.[1];
                const actualUserId = extractedUserId || userId;
                if (!actualUserId || actualUserId.trim() === '') {
                    throw new Error(`Could not determine user ID from endpoint: ${userEndpoint}`);
                }
                // Fetch current user data to get required fields (like status)
                let currentUserData = null;
                try {
                    const currentResponse = await sfClient.get(userEndpoint, {
                        $format: 'json',
                        $select: 'userId,username,status',
                    });
                    currentUserData = currentResponse.d || {};
                }
                catch (error) {
                    // If we can't fetch current data, continue but status will be required from user
                }
                // Merge current data with update data (current data as defaults)
                const mergedData = {};
                // Include required fields from current user data
                if (currentUserData) {
                    if (currentUserData.status)
                        mergedData.STATUS = currentUserData.status;
                    if (currentUserData.username)
                        mergedData.USERNAME = currentUserData.username;
                }
                // Override with provided update data
                Object.keys(updateData).forEach((key) => {
                    mergedData[key.toUpperCase()] = updateData[key];
                });
                // Ensure status is always present (required field)
                if (!mergedData.STATUS && !currentUserData?.status) {
                    throw new Error('Status field is required but not provided. Please include STATUS in your fields to update.');
                }
                // Prepare upsert payload and upsert
                const updatePayload = prepareUpsertPayload(actualUserId, mergedData);
                const result = await sfClient.post('upsert', updatePayload);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                message: `User ${userId} updated successfully`,
                                updatedFields: Object.keys(updateData),
                                updatedValues: updateData,
                                result,
                            }, null, 2),
                        },
                    ],
                };
            }
            else {
                throw new Error(`Invalid action: ${action}. Must be "get" or "update"`);
            }
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to manage user fields: ${error.message}`);
        }
    }
    async handleGetCompleteEmployeeData(args) {
        const { userId, expandProperties, format = 'json' } = args;
        try {
            // First, find the actual user ID (internal ID)
            let actualUserId = null;
            let userEndpoint = `User('${userId}')`;
            // Try direct lookup
            try {
                const directResponse = await sfClient.get(userEndpoint, {
                    $format: format,
                    $select: 'userId',
                });
                actualUserId = directResponse.d?.userId || directResponse.d?.USERID || userId;
            }
            catch (error) {
                // Try searching by USERID, EMPID, or EMAIL
                try {
                    const searchResponse = await sfClient.get('User', {
                        $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                        $format: format,
                        $select: 'userId,USERID',
                    });
                    if (searchResponse.d?.results?.length > 0) {
                        actualUserId = searchResponse.d.results[0].userId || searchResponse.d.results[0].USERID;
                        userEndpoint = `User('${actualUserId}')`;
                    }
                    else {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
                catch (searchError) {
                    // Try EMPID lookup
                    try {
                        const empJobResponse = await sfClient.get('EmpJob', {
                            $filter: `EMPID eq '${userId}'`,
                            $format: format,
                        });
                        if (empJobResponse.d?.results?.length > 0) {
                            const empId = empJobResponse.d.results[0].userId;
                            actualUserId = empId;
                            userEndpoint = `User('${actualUserId}')`;
                        }
                        else {
                            throw new Error(`User not found: ${userId}`);
                        }
                    }
                    catch (empError) {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
            }
            if (!actualUserId) {
                throw new Error(`Could not determine user ID for: ${userId}`);
            }
            // Build query parameters
            const params = {
                $format: format,
            };
            // Add expand properties if specified
            if (expandProperties && expandProperties.length > 0) {
                params.$expand = expandProperties.join(',');
            }
            else {
                // Default common navigation properties to expand
                params.$expand = 'personKeyNav,manager,hr,empInfo,secondManager,matrixManager,customManager';
            }
            // Fetch complete user data
            const response = await sfClient.get(userEndpoint, params);
            // For XML format, return as-is (it will be a string)
            if (format === 'xml') {
                return {
                    content: [
                        {
                            type: 'text',
                            text: typeof response === 'string' ? response : JSON.stringify(response, null, 2),
                        },
                    ],
                };
            }
            // For JSON format, return the complete data structure
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            userId: actualUserId,
                            requestedUserId: userId,
                            completeData: response.d || response,
                            format,
                            expandedProperties: expandProperties || ['personKeyNav', 'manager', 'hr', 'empInfo', 'secondManager', 'matrixManager', 'customManager'],
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to get complete employee data: ${error.message}`);
        }
    }
    async handleUpdateUserOData(args) {
        const { userId, username, status, firstName, lastName, gender, email, department, timeZone, managerId, hrId, additionalFields, } = args;
        try {
            // First, find the actual user ID if needed
            let actualUserId = userId;
            let userEndpoint = `User('${userId}')`;
            // Fetch current user data to get required fields and verify user exists
            let currentUserData = null;
            let currentManagerId = null;
            let currentHRId = null;
            try {
                const verifyResponse = await sfClient.get(userEndpoint, {
                    $format: 'json',
                    $select: 'userId,username,status,firstName,lastName,gender,email,department,timeZone',
                    $expand: 'manager,hr',
                });
                currentUserData = verifyResponse.d || {};
                actualUserId = currentUserData.userId || currentUserData.USERID || userId;
                // Get current manager and HR IDs
                if (currentUserData.manager) {
                    currentManagerId = currentUserData.manager.userId || 'NO_MANAGER';
                }
                if (currentUserData.hr) {
                    currentHRId = currentUserData.hr.userId || 'NO_HR';
                }
            }
            catch (error) {
                // User might not exist by USERID, try to find by other identifiers
                try {
                    const searchResponse = await sfClient.get('User', {
                        $filter: `USERID eq '${userId}' or EMPID eq '${userId}' or EMAIL eq '${userId}'`,
                        $format: 'json',
                        $select: 'userId,USERID,username,status,firstName,lastName,gender,email,department,timeZone',
                        $expand: 'manager,hr',
                    });
                    if (searchResponse.d?.results?.length > 0) {
                        currentUserData = searchResponse.d.results[0];
                        actualUserId = currentUserData.userId || currentUserData.USERID;
                        userEndpoint = `User('${actualUserId}')`;
                        // Get current manager and HR IDs
                        if (currentUserData.manager) {
                            currentManagerId = currentUserData.manager.userId || 'NO_MANAGER';
                        }
                        if (currentUserData.hr) {
                            currentHRId = currentUserData.hr.userId || 'NO_HR';
                        }
                    }
                    else {
                        throw new Error(`User not found: ${userId}`);
                    }
                }
                catch (searchError) {
                    throw new Error(`User not found: ${userId}`);
                }
            }
            // Build the payload in exact OData format
            const payload = {
                __metadata: {
                    uri: `User('${actualUserId}')`,
                    type: 'SFOData.User',
                },
                userId: actualUserId,
                // Use provided username or current username or default to userId
                username: username !== undefined ? username : (currentUserData?.username || actualUserId),
                // Status is REQUIRED - use provided or current value or default to 't'
                status: status !== undefined ? status : (currentUserData?.status || 't'),
            };
            // Add standard fields only if provided (don't include if not provided)
            if (firstName !== undefined)
                payload.firstName = firstName;
            if (lastName !== undefined)
                payload.lastName = lastName;
            if (gender !== undefined)
                payload.gender = gender;
            if (email !== undefined)
                payload.email = email;
            if (department !== undefined)
                payload.department = department;
            if (timeZone !== undefined)
                payload.timeZone = timeZone;
            // Handle manager - include only if provided
            if (managerId !== undefined) {
                const mgrId = managerId === null || managerId === '' ? 'NO_MANAGER' : managerId;
                payload.manager = {
                    __metadata: {
                        uri: `User('${mgrId}')`,
                    },
                };
            }
            // Handle HR - include only if provided
            if (hrId !== undefined) {
                const hr = hrId === null || hrId === '' ? 'NO_HR' : hrId;
                payload.hr = {
                    __metadata: {
                        uri: `User('${hr}')`,
                    },
                };
            }
            // Add any additional fields
            if (additionalFields && Object.keys(additionalFields).length > 0) {
                Object.keys(additionalFields).forEach((key) => {
                    payload[key] = additionalFields[key];
                });
            }
            // Upsert the user using POST to /upsert
            const result = await sfClient.post('upsert', payload);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `User ${actualUserId} updated successfully`,
                            userId: actualUserId,
                            payload: payload,
                            result,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            throw new McpError(ErrorCode.InternalError, `Failed to update user: ${error.message}`);
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('SuccessFactors MCP server running on stdio');
    }
}
// Start server
const server = new SuccessFactorsMCPServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map