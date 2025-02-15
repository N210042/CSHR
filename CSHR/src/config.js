const mongoose = require("mongoose");
const connect = mongoose.connect("mongodb://localhost:27017/CSHR");

connect.then(() => {
    console.log("Database connected succesfully!");
})
.catch(() => {
    console.log("Database cannot be connected!");
});


//create a schema
const LoginSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    phone: {
        type: String, 
        required: true
    },
    email: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const LoginSchemaDoctor = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        required: true
    },
    qualification: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    phone: {
        type: String, 
        required: true
    },
    email: {
        type: String,
        required: true
    },
    photo: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});


const RecordDataSchema = new mongoose.Schema({
    doctorname: {
        type: String,
        required: true
    },
    id: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    gender: {
        type: String, // Assuming gender is a string
        required: true
    },
    problem: {
        type: String, // Assuming problem is a string
        required: true
    },
    medicines: [{
        name: {
            type: String,
            required: true
        }
    }]
});


const doctorStatSchema = new mongoose.Schema({
    doctorId: { type: String, required: true }, // Reference to the doctor's ID
    year: { type: Number, required: true }, // Year of the statistics
    months: [
        {
            month: { type: String, required: true }, // Month name (e.g., "January")
            shifts: { type: Number, default: 0 }, // Number of shifts
            casesSolved: { type: Number, default: 0 }, // Number of cases solved
            leaves: { type: Number, default: 0 }, // Number of leaves
            salary: { type: String, default: "Pending" } // Salary status
        }
    ]
});




//collection part   

const collectionStudents = new mongoose.model("students",LoginSchema);
const collectionEmployees = new mongoose.model("employees",LoginSchemaDoctor);
const collectionRecords = new mongoose.model("records",RecordDataSchema);
const collectionDoctorStats = new mongoose.model('DoctorStat', doctorStatSchema);

module.exports = {
    collectionStudents: collectionStudents,
    collectionEmployees: collectionEmployees,
    collectionRecords: collectionRecords,
    DoctorStat: collectionDoctorStats
};