const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const app = express()

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

// 🟢 Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

// 🟢 Esquemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
})

const exerciseSchema = new mongoose.Schema({
  userId: String,
  description: String,
  duration: Number,
  date: Date
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema)

// ✅ Crear usuario
app.post('/api/users', async (req, res) => {
  const user = new User({ username: req.body.username })
  await user.save()
  res.json({ username: user.username, _id: user._id })
})

// ✅ Obtener todos los usuarios
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username')
  res.json(users)
})

// ✅ Agregar ejercicio
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body
  const user = await User.findById(req.params._id)
  if (!user) return res.send('User not found')

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: parseInt(duration),
    date: date ? new Date(date) : new Date()
  })

  await exercise.save()

  res.json({
    _id: user._id,
    username: user.username,
    date: exercise.date.toDateString(),
    duration: exercise.duration,
    description: exercise.description
  })
})

// ✅ Obtener historial de ejercicios
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query
  const user = await User.findById(req.params._id)
  if (!user) return res.send('User not found')

  let filter = { userId: user._id }
  if (from || to) filter.date = {}
  if (from) filter.date.$gte = new Date(from)
  if (to) filter.date.$lte = new Date(to)

  let query = Exercise.find(filter).select('-_id description duration date')
  if (limit) query = query.limit(parseInt(limit))

  const log = await query.exec()

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }))
  })
})

// 🔊 Escuchar puerto
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
