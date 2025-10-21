const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow any website
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", // Allow these methods
        "Access-Control-Allow-Headers": "Content-Type,Authorization" // Allow these headers
    };

    // Handle CORS preflight requests (needed for PUT/DELETE)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        let pathParamId = event.pathParameters ? event.pathParameters.id : null; // Get ID from URL like /todos/{id}
        let requestJSON = event.body ? JSON.parse(event.body) : {};

        switch (event.httpMethod) {
            case "GET":
                // Get all items
                body = await dynamoDb.send(new ScanCommand({ TableName: TABLE_NAME }));
                body = body.Items;
                break;

            case "POST":
                // Add a new item
                if (!requestJSON.todo) throw new Error("Missing 'todo' text in request body");
                const newItemId = Date.now().toString(); // Use timestamp as ID
                await dynamoDb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: { id: newItemId, todo: requestJSON.todo }
                }));
                body = { message: "Item added!", id: newItemId, todo: requestJSON.todo };
                break;

            case "DELETE":
                // Delete an item by ID
                if (!pathParamId) throw new Error("Missing item ID in path (/todos/{id})");
                await dynamoDb.send(new DeleteCommand({
                    TableName: TABLE_NAME,
                    Key: { id: pathParamId }
                }));
                body = { message: "Item deleted!" };
                break;

            case "PUT":
                // Update an item by ID
                if (!pathParamId) throw new Error("Missing item ID in path (/todos/{id})");
                if (!requestJSON.todo) throw new Error("Missing 'todo' text in request body");
                await dynamoDb.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { id: pathParamId },
                    UpdateExpression: "set todo = :t",
                    ExpressionAttributeValues: { ":t": requestJSON.todo },
                    ReturnValues: "UPDATED_NEW"
                }));
                body = { message: "Item updated!" };
                break;

            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = 400;
        body = { error: err.message };
        console.error("Error processing request:", err); // Log the error
    }

    return {
        statusCode,
        body: JSON.stringify(body),
        headers,
    };
};