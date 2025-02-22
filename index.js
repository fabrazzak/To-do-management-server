const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const socketIo = require('socket.io');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
const uri = process.env.DATABASE_URL;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
});

// MongoDB Collection Setup
let tasksCollection, usersCollection;

async function run() {
    try {
        await client.connect();
        console.log("✅ Connected to MongoDB");

        const db = client.db("task-manager");
        tasksCollection = db.collection("tasks");
        usersCollection = db.collection("users");

        // Start the server here after the MongoDB connection is successful
        const server = app.listen(port, () => {
            console.log(`✅ Server running on port ${port}`);
        });

        const io = socketIo(server);

        // Socket.IO real-time events
        io.on('connection', (socket) => {
            console.log('⚡ User connected');
            socket.on('disconnect', () => {
                console.log('⚡ User disconnected');
            });
        });

        // 📌 1️⃣ Create a New User (Store Google Login Data)
        app.post("/users", async (req, res) => {
            const { uid, email, displayName } = req.body;
            try {
                const existingUser = await usersCollection.findOne({ uid });
                if (!existingUser) {
                    await usersCollection.insertOne({ uid, email, displayName });
                    return res.status(201).json({ message: "✅ User added to database" });
                }
                res.status(200).json({ message: "ℹ️ User already exists" });
            } catch (error) {
                console.error("❌ Error saving user:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        });

        // 📌 2️⃣ Create a New Task
        app.post("/tasks", async (req, res) => {
            try {
                const task = req.body;
                const result = await tasksCollection.insertOne(task);
                res.status(201).json({ ...task, _id: result.insertedId });
            } catch (error) {
                res.status(500).json({ error: "❌ Error creating task" });
            }
        });

        // 📌 3️⃣ Get All Tasks
        app.get("/tasks", async (req, res) => {
            try {
                const tasks = await tasksCollection.find().toArray();
                res.status(200).json(tasks);
            } catch (error) {
                res.status(500).json({ error: "❌ Error fetching tasks" });
            }
        });

        // 📌 4️⃣ Get a Single Task by ID
        app.get("/tasks/:id", async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const task = await tasksCollection.findOne({ _id: id });
                task ? res.status(200).json(task) : res.status(404).json({ error: "⚠️ Task not found" });
            } catch (error) {
                res.status(500).json({ error: "❌ Error fetching task" });
            }
        });

        // 📌 5️⃣ Update a Task
        app.put("/tasks/:id", async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const updatedTask = req.body;
                const result = await tasksCollection.updateOne({ _id: id }, { $set: updatedTask });

                result.modifiedCount > 0
                    ? res.status(200).json({ message: "✅ Task updated" })
                    : res.status(404).json({ error: "⚠️ Task not found" });
            } catch (error) {
                res.status(500).json({ error: "❌ Error updating task" });
            }
        });
        

        // 📌 6️⃣ Delete a Task
        app.delete("/tasks/:id", async (req, res) => {
            try {
                const id = new ObjectId(req.params.id);
                const result = await tasksCollection.deleteOne({ _id: id });

                result.deletedCount > 0
                    ? res.status(200).json({ message: "✅ Task deleted" })
                    : res.status(404).json({ error: "⚠️ Task not found" });
            } catch (error) {
                res.status(500).json({ error: "❌ Error deleting task" });
            }
        });

    } catch (error) {
        console.error("❌ Error connecting to MongoDB", error);
    }
} 

// 📌 Base Route
app.get('/', (req, res) => {
    res.send('🚀 Task Manager API is Running!');
});

// Run the server and connect to MongoDB
run().catch(console.dir);
