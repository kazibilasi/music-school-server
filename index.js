const express = require('express');
const app = express();
require('dotenv').config()
const cors = require('cors');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY)
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// GQmWMlAZmymbm5do
// music-school


// const corsOptions = {
//   origin: '*',
//   credentials: true,
//   optionSuccessStatus: 200,
//   methods:['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
// }

// app.use(cors(corsOptions))


const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.use(express.json())

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;


  if (!authorization) {

    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {

      return res.status(403).send({ error: true, message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  })
}








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
    const AddClasses = client.db('MusicSchool').collection('addClasses')
    const musicInstructors = client.db('MusicSchool').collection('Instructors')
    const cartCollection = client.db('MusicSchool').collection('carts')
    const userCollection = client.db('MusicSchool').collection('users')


    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded;
      const query = { email: email }

      const user = await userCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next()
    }
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (user?.role !== 'instructor') {
        return res.status(403).send({ error: true, message: 'forbidden message' })
      }
      next()
    }



    app.post("/create-payment-intent", async (req, res) => {
      const { items } = req.body;
      const amount = price*100

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        automatic_payment_methods:['card'],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/jwt', (req, res) => {
      const user = req.body.email;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
      res.send({ token })

    })

    app.get('/Classes', async (req, res) => {
      const result = await musicClasses.find().toArray();
      res.send(result);
    })

    app.get('/Instructors', async (req, res) => {
      const result = await musicInstructors.find().toArray();
      res.send(result);
    })

    app.post('/carts', async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item)
      res.send(result)
    })
    app.post('/addClasses', async (req, res) => {
      const item = req.body;
      const result = await musicClasses.insertOne(item)
      res.send(result)
    })

    app.patch('/addClasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const body = req.body;
      const updateDoc = {
        $set: {
          status: body.status,
        }
      };
      const result = await musicClasses.updateOne(query, updateDoc);
      res.send(result)

    })

    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email;
      // if (!email) {
      //   res.send([]);
      // }
      if (email) {
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();

        return res.send(result);
      }
      res.send([])
      // const decodedEmail= req.decoded.email;
      // if(email!== decodedEmail){
      //   return res.status(401).send({ error: true, message: 'unauthorized access' })
      // }


    })
    app.get('/addClasses', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      // const decodedEmail= req.decoded.email;
      // if(email!== decodedEmail){
      //   return res.status(401).send({ error: true, message: 'unauthorized access' })
      // }

      const query = { instructorEmail: email };
      const result = await musicClasses.find(query).toArray();
      res.send(result);

    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result)
    })
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })

    app.get('/users', verifyJWT, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)

    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin"
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor"
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })


    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      // if(req.decoded.email !== email){
      //   res.send({admin:false})
      // }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === "admin" }
      res.send(result);
    })
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      // if(req.decoded.email !== email){
      //   res.send({instructor:false})
      // }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" }
      res.send(result);
    })



    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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