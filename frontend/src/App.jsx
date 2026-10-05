import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

function App() {
  const [countries, setCountries] = useState(null)
  const [currentCountry, setCurrentCountry] = useState(null)
  const [score, setScore] = useState(0)
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false)
  //this part would keep it green havent added the other 
  //parts that would fully do that yet as want to talk to group first
  //const [completedCountries, setCompletedCountries] = useState([])

  const splitFrance = (data) => {
    const newFeatures = []

    data.features.forEach((feature) => {
      if (feature.properties.ADMIN === 'France') {
        feature.geometry.coordinates.forEach((polygon, index) => {
          let pieceName = 'France'

          if (index === 5) {
            pieceName = 'Martinique'
          } else if (index === 7) {
            pieceName = 'Guadeloupe'
          } else if (index === 9) {
            pieceName = 'French Guiana'
          }

          newFeatures.push({
            ...feature,
            properties: {
              ...feature.properties,
              ADMIN: pieceName,
            },
            geometry: {
              type: 'MultiPolygon',
              coordinates: [polygon],
            },
          })
        })
      } else {
        newFeatures.push(feature)
      }
    })

    return {
      ...data,
      features: newFeatures,
    }
  }

  useEffect(() => {
    fetch('/data/countries.geojson')
      .then((response) => response.json())
      .then((data) => {
        const updatedData = splitFrance(data)
        setCountries(updatedData)
      })
  }, [])

  const startQuiz = () => {
    if (!countries) return

    const randomIndex = Math.floor(
      Math.random() * countries.features.length
    )

    const randomCountry = countries.features[randomIndex]

    setCurrentCountry(randomCountry.properties.ADMIN)
    setSelectedCountry(null)
    setFeedback('')
    setAnsweredCorrectly(false)
  }

  const checkAnswer = (countryName) => {
    if (!currentCountry || answeredCorrectly) return

    setSelectedCountry(countryName)

    if (countryName === currentCountry) {
      setScore((previousScore) => previousScore + 1)
      setFeedback('Correct! Nice job.')
      setAnsweredCorrectly(true)
    } else {
      setFeedback(`Not quite. You clicked ${countryName}. Try again!`)
    }
  }

  const getCountryStyle = (feature) => {
    const countryName = feature.properties.ADMIN

    if (selectedCountry === countryName) {
      if (countryName === currentCountry) {
        return {
          color: '#166534',
          weight: 2,
          fillColor: '#22c55e',
          fillOpacity: 0.9,
        }
      }

      return {
        color: '#991b1b',
        weight: 2,
        fillColor: '#ef4444',
        fillOpacity: 0.9,
      }
    }

    return {
      color: '#333',
      weight: 1,
      fillColor: '#9ca3af',
      fillOpacity: 0.8,
    }
  }

  return (
    <div className="app">
      <header>
        <h1>GeoFill</h1>
        <p>Fill the Map. Learn the World.</p>
      </header>

      <main>
        <div className="game-info">
          <h2>Country Quiz</h2>
          <p>Identify the country shown on the map.</p>

          <div className="score">
            Score: {score}
          </div>
        </div>

        <div className="map-container">
          {countries && (
            <MapContainer
              center={[20, 0]}
              zoom={1.5}
              minZoom={1.5}
              maxZoom={8}
              maxBounds={[
                [-90, -180],
                [85, 200],
              ]}
              maxBoundsViscosity={1.0}
              worldCopyJump={false}
              style={{ height: '500px', width: '100%' }}
            >
              <GeoJSON
                key={`${currentCountry}-${selectedCountry}`}
                data={countries}
                style={getCountryStyle}
                onEachFeature={(feature, layer) => {
                  layer.on({
                    click: () => {
                      checkAnswer(feature.properties.ADMIN)
                    },
                  })
                }}
              />
            </MapContainer>
          )}
        </div>

        <div className="question">
          {currentCountry ? (
            <h2>Find: {currentCountry}</h2>
          ) : (
            <h2>Ready to play?</h2>
          )}

          {feedback && (
            <p className="feedback">
              {feedback}
            </p>
          )}

          <button onClick={startQuiz}>
            {currentCountry && answeredCorrectly
              ? 'Next Question'
              : currentCountry
              ? 'New Question'
              : 'Start Quiz'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default App