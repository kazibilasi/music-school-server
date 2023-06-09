const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion , ObjectId} = require('mongodb');
const port = process.env.PORT || 5000;

// GQmWMlAZmymbm5do
// music-school


const corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xemmjwp.mongodb.net/?retryWrites=true&w=majority`;

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
        const musicClasses = client.db('MusicSchool').collection('Classes')
        const musicInstructors = client.db('MusicSchool').collection('Instructors')
        const cartCollection = client.db('MusicSchool').collection('carts')

        app.get('/Classes', async (req, res) => {
            const result = await musicClasses.find().toArray();
            res.send(result);
          })

          app.get('/Instructors', async (req, res) => {
            const result = await musicInstructors.find().toArray();
            res.send(result);
          })

          app.post('/carts', async (req, res)=>{
            const item = req.body;
            const result = await cartCollection.insertOne(item)
            res.send(result)
          })

          app.get('/carts', async(req, res)=>{
            const email = req.query.email;
            if(!email){
                res.send([]);
            }
            const query = {email : email};
            const result = await cartCollection.find(query).toArray();
            res.send(result);
          })

          app.delete('/carts/:id', async (req, res)=>{
            const id = req.params.id;
            const query = {_id: new ObjectId(id)};
            const result = await cartCollection.deleteOne(query);
            res.send(result)
          })

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
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
    res.send('Music School!');
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})