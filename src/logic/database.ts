import {ObjectId} from "mongodb";
import {v4} from "uuid";
import {Model} from "../db/models";
import uuid from 'time-uuid';
import {IDatabase} from "../db/models/database";
import {MongoClient, Db} from 'mongodb'

let client: MongoClient, newDb: Db;

export async function listDbs(userId: ObjectId) {
  return Model.Database.find({userId}).toArray()
}

export async function createDb(userId: ObjectId, name: string) {
  const timestampId = uuid()
  const password = v4().replaceAll('-', '')
  const doc: IDatabase = {
    userId,
    name,
    dbName: `${timestampId}${userId}`,
    username: timestampId,
    password,
    sizeInGB: 0,
    createDt: new Date()
  }
  const {insertedId} = await Model.Database.insertOne(doc)

  try {
    const {
      DATABASE_HOST,
      DATABASE_USERNAME,
      DATABASE_PASSWORD,
    } = process.env;
    const url = DATABASE_USERNAME
        ? `mongodb://${DATABASE_USERNAME}:${DATABASE_PASSWORD}@${DATABASE_HOST}`
        : `mongodb://${DATABASE_HOST}`;
    client = new MongoClient(url);
    newDb = client.db(doc.dbName)
    await newDb.createCollection('col1');
    await newDb.command({
      createUser:doc.username,
      pwd: doc.password,
      roles:[
        {role: "dbOwner", db: doc.dbName}
      ]
    })
  } catch(e) {
    console.log('Fail to connect to new database',e)
  }
  doc._id = insertedId
  return doc;
}

export async function removeDb(userId: ObjectId, dbId: ObjectId) {
  return Model.Database.deleteOne({_id: dbId, userId})
}

export async function throwIfUserDoesNotOwnDb(userId: ObjectId, dbId: ObjectId) {
  const count = await Model.Database.countDocuments({_id: dbId, userId})
  if (count === 1) return true
  throw new Error("User doesn't own db")
}