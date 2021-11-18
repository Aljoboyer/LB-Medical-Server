const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const app = express();
var admin = require("firebase-admin");
const fileupload = require('express-fileupload')
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const port = process.env.PORT || 5000;

//firebase admin
var serviceAccount = require('./lifebridge-medical-express-firebase-adminsdk.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middle ware 
app.use(cors());
app.use(express.json());
app.use(fileupload());

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.USER_PASS}@cluster0.obwta.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//verifying token 
async function VrifyToken(req, res, next){
    if(req.headers.authorization.startsWith('Bearer '))
    {
        const idtoken = req.headers.authorization.split('Bearer ')[1];
        try{
            const decodedUser = await admin.auth().verifyIdToken(idtoken);
            req.decodedEmail = decodedUser.email;
        }
        catch{

        }
    }
    next()
}

async function run(){
    try{
        await client.connect();

        const database = client.db('MedicalserviceDB');
        const MediserviceCollection = database.collection('MediserviceCollection');
        const PatientCollection = database.collection('PatientCollection');
        const UserCollection = database.collection('UserCollection');
        const DocAppointmentCollection = database.collection('DocAppointmentCollection')
        const PatientAppointmetnCollection = database.collection('PatientAppointmetnCollection')
        //geting all service
        app.get('/services', async(req, res) => {
            const cursor = MediserviceCollection.find({});
            const result =  await cursor.toArray();
            res.send(result)
        })
         //admin geting all patient request service
         app.get('/allpatientservice', async(req, res) => {
            const cursor = PatientCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        })
            //admin deleting patient individual request service
            app.delete('/patientdeleteservice/:id', async( req, res) => {
                console.log(req.params.id)
               const id = req.params.id;
               const query = {_id: ObjectId(id)};
               const result = await PatientCollection.deleteOne(query)
               res.send(result)
           })
                //accepting patient services 
        app.put('/acceptpatinetservice/:id', async(req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const option = {upsert: true};
            const updatedoc = {
                $set:{
                    status: 'Approved'
                }
            }
            const result = await PatientCollection.updateOne(filter, updatedoc, option)
            res.json(result)
        })
        //adding new service 
        app.post('/services', async (req, res) => {
            const data = req.body;
            const picdata = req.files.img.data;
            const encodedpic = picdata.toString('base64');
            const imgBuffer = Buffer.from(encodedpic, 'base64')
            const mediservice ={...data, img: imgBuffer}
            const result = await MediserviceCollection.insertOne(mediservice);
            res.json(result)
        })
        //deleting service 
        app.delete('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await MediserviceCollection.deleteOne(query);
            res.send(result)
        })
        //manage all services
        app.get('/manageservices', async (req, res) => {
            const cursor = MediserviceCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let result;
            const count = await cursor.count();
            if(page)
            {
                
                 result = await cursor.skip(page * size).limit(size).toArray();
            }
            else{
                result= await cursor.toArray();
            }
            res.send({
                result,
                count
            })
        })
        //geting service by their id
        app.get('/services/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await MediserviceCollection.findOne(query);
            res.send(result);
        })
        app.post('/getservice', async(req, res) => {
            const service = req.body;
            const result = await PatientCollection.insertOne(service);
            res.json(result)
        })
        //get patients individual service
        app.get('/patientservice',VrifyToken, async(req, res) => {
                const email = req.query.email;
                if(req.decodedEmail === email)
                {
                    const query = {email: email};
                    const cursor =  PatientCollection.find(query);
                    const result = await cursor.toArray();
                    res.send(result)
                }
                else{
                    res.status(401).json({message: 'User Not Authorised'})
                }
        })
        //user delete servic
        app.delete('/deleteservice/:id', async( req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await PatientCollection.deleteOne(query)
            res.send(result)
        })

        //user saving
        app.post('/users',async (req, res) => {
            const user = req.body;
            const result = await UserCollection.insertOne(user);
            res.json(result)
        })
        //adding admin role 
        app.put('/user', async (req, res) => {
            const email = req.query.email;
            const filter = {email: email}
            const option = {upsert: true};
            const updatedoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await UserCollection.updateOne(filter, updatedoc, option)
            res.json(result)
        })
        //finding admin
        app.get('/admincheck', async (req, res) => {
            const email = req.query.email;
            const query = {email: email};
            let admin = false;
            const user = await UserCollection.findOne(query)
            if(user.role === 'Admin')
            {
                admin = true
            }
            res.send({
                admin: admin
            })
        })
         //admin geting all patient appointment
 app.get('/admingetappointment', async(req, res) => {
    const cursor = PatientAppointmetnCollection.find({});
    const result = await cursor.toArray();
    res.send(result)
})
 //admin accepting individual patient appointment
 app.put('/admingetappointment/:id', async(req, res) => {
         const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const option = {upsert: true};
            const updatedoc = {
                $set:{
                    status: 'Approved'
                }
            }
            const result = await PatientAppointmetnCollection.updateOne(filter, updatedoc, option)
            res.json(result)
})
        //admin deleting individual patient appointment
        app.delete('/admingetappointment/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await PatientAppointmetnCollection.deleteOne(query)
            res.send(result)
        })
        //geting doctors all appointment
        app.get('/docappointment', async( req, res) => {
            const cursor = DocAppointmentCollection.find({});
            const result = await cursor.toArray();
            res.send(result)
        })
        //posting appointment
        app.post('/appointments', async (req,res) => {
            const data = req.body;
            const result = await PatientAppointmetnCollection.insertOne(data);
            res.json(result)
        })

        //geting patient individual appointment
        app.get('/patientappointment',VrifyToken, async(req, res) => {
            const email = req.query.email;
            if(req.decodedEmail === email)
            {
                const query = {email: email};
                const cursor =  PatientAppointmetnCollection.find(query);
                const result = await cursor.toArray();
                res.send(result)
            }
            else{
                res.status(401).json({message: 'User Not Authorised'})
            }
            //user delete appointment
        app.delete('/deleteappointment/:id', async( req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await PatientAppointmetnCollection.deleteOne(query)
            res.send(result)
        })
       

    })
    }
    finally{

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Medical Server Is connected')
});

app.listen(port, (req, res) => {
    console.log('port is', port)
})