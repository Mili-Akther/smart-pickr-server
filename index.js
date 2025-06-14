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

    const recommendationsCollection = client
      .db("smartPickr")
      .collection("recommendations");
      

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

    // DELETE a single feedback by ID
    app.delete("/product-application/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await productApplicationCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error("Delete failed:", error);
        res.status(500).send({ error: "Failed to delete feedback" });
      }
    });

    // GET all queries sorted by latest price
    app.get("/queries", async (req, res) => {
      try {
        const result = await productApplicationCollection
          .find()
          .sort({ ProductPrice: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Failed to fetch queries" });
      }
    });
    // GET a single query by ID
    app.get("/queries/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productApplicationCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Query not found" });
      }
    });

    // PATCH: increment recommendation count
    // app.patch("/product-application/recommendation/:id", async (req, res) => {
    //   const result = await applications.updateOne(
    //     { _id: new ObjectId(req.params.id) },
    //     { $inc: { recommendationCount: 1 } }
    //   );
    //   res.send(result);
    // });

    //  POST Route: Add a new recommendation
    app.post("/recommendations", async (req, res) => {
      try {
        const recommendation = req.body;

        const result = await recommendationsCollection.insertOne(
          recommendation
        );

        const queryId = recommendation.queryId;
        await productApplicationCollection.updateOne(
          { _id: new ObjectId(queryId) },
          { $inc: { recommendationCount: 1 } }
        );

        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ error: "Failed to add recommendation", details: error });
      }
    });

    // GET Route: Get all recommendations for a specific query
    app.get("/recommendations", async (req, res) => {
      try {
        const { productName } = req.query;

        const filter = productName ? { originalProductName: productName } : {};      

        const result = await recommendationsCollection
          .find(filter)
          .sort({ timeStamp: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: "Failed to get recommendations",
          details: error.message,
        });
      }
    });

    app.patch("/product-application/recommendation/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $inc: { recommendationCount: 1 },
      };
      try {
        const result = await productApplicationCollection.updateOne(
          filter,
          updateDoc
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: "Failed to increment recommendation count",
          details: error,
        });
      }
    });

    // GET Route: Get all recommendations made by a specific user
    app.get("/my-recommendations", async (req, res) => {
      try {
        const { email } = req.query;

        if (!email) {
          return res.status(400).send({ error: "Email is required" });
        }

        const result = await recommendationsCollection
          .find({ recommenderEmail: email })
          .sort({ timeStamp: -1 })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          error: "Failed to get user recommendations",
          details: error.message,
        });
      }
    });

    // DELETE Route: Delete a recommendation and decrement query count
    app.delete("/recommendations/:id", async (req, res) => {
      try {
        const { id } = req.params;

       
        const recommendation = await recommendationsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!recommendation) {
          return res.status(404).send({ error: "Recommendation not found" });
        }

     
        const deleteResult = await recommendationsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (deleteResult.deletedCount === 1) {
         
          await productApplicationCollection.updateOne(
            { _id: new ObjectId(recommendation.queryId) },
            { $inc: { recommendationCount: -1 } }
          );

          res.send({
            success: true,
            message: "Recommendation deleted successfully",
            deletedCount: deleteResult.deletedCount,
          });
        } else {
          res.status(404).send({ error: "Recommendation not found" });
        }
      } catch (error) {
        res.status(500).send({
          error: "Failed to delete recommendation",
          details: error.message,
        });
      }
    });


    // GET Route: Get all recommendations made by others for the current user's queries
    app.get("/recommendations-for-me", async (req, res) => {
      const all = await recommendationsCollection.find({}).toArray();
  res.send(all);
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

