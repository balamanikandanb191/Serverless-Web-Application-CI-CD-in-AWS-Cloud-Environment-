// Use the AWS SDK
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

// Create a DynamoDB client
const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

// Get the table name from an environment variable (set in template.yaml)
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow any website to call this
    };

    try {
        switch (event.httpMethod) {
            case "GET":
                // Get all items from the table
                body = await dynamoDb.send(new ScanCommand({ TableName: TABLE_NAME }));
                body = body.Items;
                break;
                
            case "POST":
                // Add a new item to the table
                let requestJSON = JSON.parse(event.body);
                await dynamoDb.send(new PutCommand({
                    TableName: TABLE_NAME,
                    Item: {
                        id: Date.now().toString(), // Simple unique ID
                        todo: requestJSON.todo
                    }
                }));
                body = { message: "Item added!" };
                break;
                
            default:
                throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
    } catch (err) {
        statusCode = 400;
        body = { error: err.message };
    } finally {
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers,
    };
};