const express = require('express');
const axios = require('axios');
const cors = require('cors');
const Redis = require('redis');
const { json } = require('body-parser');

const app = express();
const RedisClient = Redis.createClient(); // we need to pass url for production server
const DEFAULT_EXPIRATION = 3600;

app.use(cors());

app.get("/photos", async (req,res,next) => {
    const albumId = req.query.albumId;
    const photos = await cacheGetOrSet (`photos?albumId=${albumId}`, async () => {
        const {data} = await axios.get("https://jsonplaceholder.typicode.com/photos", 
            { params: {albumId} })
        return data
    })
    res.json(photos)
});

app.get("/photos/:id", async(req,res,next) => {
    const id = req.params.id;
    const photo = await cacheGetOrSet(`photos:${id}`, async () => {
        const {data} = await axios.get(`https://jsonplaceholder.typicode.com/photos/${id}`, 
            { params: {id} })
        return data
    })
    res.json(photo)
})

function cacheGetOrSet (keys, cb) {
    return new Promise((resolve, reject) => {
        RedisClient.get(keys, async(error, data) => {
            if(error) return reject(error)
            if(data != null) return resolve(JSON.parse(data))
            const freshData = await cb()
            RedisClient.setex(keys, DEFAULT_EXPIRATION, JSON.stringify(freshData))
            resolve(freshData)
            
        })
    })
}

app.listen(3000);