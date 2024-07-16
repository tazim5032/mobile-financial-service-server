const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
    ],
    credentials: true,
    optionSuccessStatus: 200,
}));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o4eqbyc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const userCollection = client.db('mkash').collection('users');

        // Connect the client to the server (optional starting in v4.7)
        await client.connect();
        console.log("Connected to MongoDB!");

        // Endpoint to handle registration
        app.post('/register', async (req, res) => {
            const { name, email, mobileNumber, pin, accountType } = req.body;

            // Validate the input
            if (!name || !email || !/^\d{5}$/.test(pin) || !/^01\d{9}$/.test(mobileNumber)) {
                return res.status(400).send('Invalid input');
            }

            // Create the user object
            const newUser = {
                name,
                email,
                mobileNumber,
                pin,
                accountType,
                account_status: 'pending',
                balance: 0,
                total_transaction_made: 0,
            };

            try {
                // Insert the new user into the database
                const result = await userCollection.insertOne(newUser);
                res.status(201).send({ message: 'User registered successfully', userId: result.insertedId });
            } catch (error) {
                console.error('Error inserting user:', error);
                res.status(500).send('Error registering user');
            }
        });

        // Endpoint to handle login
        app.post('/login', async (req, res) => {
            const { identifier, pin } = req.body;

            try {
                // Check if user exists with given email or mobile number and PIN
                const user = await userCollection.findOne({
                    $or: [
                        { email: identifier },
                        { mobileNumber: identifier },
                    ],
                    pin,
                });

                if (user) {
                    res.status(200).send({ success: true, message: 'Login successful' });
                } else {
                    res.status(401).send({ success: false, message: 'Invalid credentials' });
                }
            } catch (error) {
                console.error('Error during login:', error);
                res.status(500).send('Error during login');
            }
        });

        //Backend Endpoint for Fetching User Data to determine dashboard options
        //corrupted
        // app.get('/user-data', async (req, res) => {
        //     // Replace this with your actual user authentication logic
        //     const userId = req.user.id;

        //     try {
        //         const user = await userCollection.findOne({ _id: new ObjectId(userId) });
        //         if (user) {
        //             res.status(200).send({ accountType: user.accountType });
        //         } else {
        //             res.status(404).send('User not found');
        //         }
        //     } catch (error) {
        //         console.error('Error fetching user data:', error);
        //         res.status(500).send('Error fetching user data');
        //     }
        // });

        // Endpoint to fetch all users
        app.get('/users', async (req, res) => {
            try {
                const users = await userCollection.find({}).toArray();
                res.status(200).json(users);
            } catch (error) {
                console.error('Error fetching users:', error);
                res.status(500).send('Error fetching users');
            }
        });


        // Endpoint to search users by name
        app.get('/users/search', async (req, res) => {
            const { search } = req.query;
            try {
                const regex = new RegExp(search, 'i'); // Case-insensitive search
                const users = await userCollection.find({ name: { $regex: regex } }).toArray();
                res.status(200).json(users);
            } catch (error) {
                console.error('Error searching users:', error);
                res.status(500).send('Error searching users');
            }
        });

           // Endpoint to handle account actions (activate/block)
           app.put('/users/:userId/:action', async (req, res) => {
            const { userId, action } = req.params;
            try {
                // Update user's account status based on action
                let updateField = {};
                if (action === 'activate') {
                    updateField = { account_status: 'active' };
                } else if (action === 'block') {
                    updateField = { account_status: 'blocked' };
                } else {
                    return res.status(400).send('Invalid action');
                }

                const result = await userCollection.updateOne({ _id: new ObjectId(userId) }, { $set: updateField });
                if (result.modifiedCount > 0) {
                    res.status(200).send('User account updated successfully');
                } else {
                    res.status(404).send('User not found');
                }
            } catch (error) {
                console.error('Error updating user account:', error);
                res.status(500).send('Error updating user account');
            }
        });





        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('server is running');
});

app.listen(port, () => {
    console.log(`server is running at port ${port}`);
});
