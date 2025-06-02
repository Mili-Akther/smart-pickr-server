const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware

app.use(express.json());
app.use(cors());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7pf2bll.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // products Related Apis
    const productsCollection = client.db("smartPickr").collection("products");
    const productApplicationCollection = client
      .db("smartPickr")
      .collection("product_applications");

    app.get("/products", async (req, res) => {
      const cursor = await productsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    //  product application apis
    app.post("/product-application", async (req, res) => {
      const application = req.body;
      const result = await productApplicationCollection.insertOne(application);
      res.send(result);
    });

    app.post("/products", async (req, res) => {
      const newProduct = req.body;
      const result = await productsCollection.insertOne(newProduct);
      res.send(result);
    });

    // get data using email
    app.get("/product-Feedback", async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      const result = await productApplicationCollection.find(query).toArray();
      res.send(result);
    });

    // New GET endpoint to get all applications with joined product data
    app.get("/product_applications", async (req, res) => {
      const applications = await productApplicationCollection.find().toArray();

      const updatedApplications = await Promise.all(
        applications.map(async (application) => {
          const query1 = { _id: new ObjectId(application.product_id) };
          const product = await productsCollection.findOne(query1);
          if (product) {
            application.ProductName = product.ProductName;
            application.ProductBrand = product.ProductBrand;
            application.ProductImageURL = product.ProductImageURL;
            application.ProductTitle = product.ProductTitle;
            application.ProductDescription = product.ProductDescription;
            application.ProductPrice = product.ProductPrice;
          }
          return application;
        })
      );

      res.send(updatedApplications);
    });

    // GET a single feedback by ID
    app.get("/product-application/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productApplicationCollection.findOne(query); 
      res.send(result);
    });

    // PUT update feedback
    app.put("/product-application/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: updateData,
      };
      const result = await productApplicationCollection.updateOne(
        filter,
        updateDoc
      ); 
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);







app.get("/", (req, res) => {
  res.send("hello! Smart People");
});

app.listen(port, () => {
  console.log(" SmartPickr Server is Running...");
});

