
import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

const continents = [
  'North America',
  'South America',
  'Europe',
  'Africa',
  'Asia',
  'Oceania',
]

// Determines which continent a location belongs to.
function getFeatureContinent(feature) {
  const countryName = feature.properties.ADMIN

  if (
    countryName === 'Martinique' ||
    countryName === 'Guadeloupe' ||
    countryName === 'Saba' ||
    countryName === 'Sint Eustatius'
  ) {
    return 'North America'
  }

  if (countryName === 'French Guiana') {
    return 'South America'
  }

  return feature.properties.CONTINENT
}

// Determines whether a location is part of the quiz.
function isQuizLocation(feature) {
  return feature.properties.IS_QUIZ_LOCATION !== false
}

function getRandomCountry(countryList) {
  const randomIndex = Math.floor(Math.random() * countryList.length)
  return countryList[randomIndex]
}

function WorldMap({
  countries,
  currentCountry,
  correctCountries,
  incorrectCountry,
  skippedCountry,
  selectedContinent,
  interactive,
  awaitingAcknowledgment,
  onCountryClick,
}) {
  const getCountryStyle = (feature) => {
    const countryName = feature.properties.ADMIN
    const featureContinent = getFeatureContinent(feature)

    if (interactive && featureContinent !== selectedContinent) {
      return {
        color: '#475569',
        weight: 1,
        fillColor: '#64748b',
        fillOpacity: 0.8,
      }
    }

    // Correctly identified countries stay green.
    if (correctCountries.includes(countryName)) {
      return {
        color: '#166534',
        weight: 2,
        fillColor: '#22c55e',
        fillOpacity: 0.9,
      }
    }

    // A skipped country is temporarily orange.
    if (skippedCountry === countryName) {
      return {
        color: '#c2410c',
        weight: 2,
        fillColor: '#f97316',
        fillOpacity: 0.9,
      }
    }

    // The most recent incorrect guess is red.
    if (incorrectCountry === countryName) {
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
    <MapContainer
      key={interactive ? 'quiz-map' : 'home-map'}
      center={[20, 0]}
      zoom={1.5}
      minZoom={1.5}
      maxZoom={12}
      maxBounds={[
        [-90, -180],
        [85, 200],
      ]}
      maxBoundsViscosity={1.0}
      worldCopyJump={false}
      style={{ height: '500px', width: '100%' }}
    >
      {countries && (
        <GeoJSON
          key={`${selectedContinent}-${currentCountry}-${correctCountries.length}-${incorrectCountry}-${skippedCountry}`}
          data={countries}
          style={getCountryStyle}
          onEachFeature={(feature, layer) => {
            const countryName = feature.properties.ADMIN
            const featureContinent = getFeatureContinent(feature)
            const quizLocation = isQuizLocation(feature)

            // Highlight the country when the cursor moves over it.
            layer.on({
              mouseover: () => {
                const originalStyle = getCountryStyle(feature)

                layer.setStyle({
                  ...originalStyle,
                  color: '#111827',
                  weight: originalStyle.weight + 1,
                  fillOpacity: Math.min(
                    originalStyle.fillOpacity + 0.15,
                    1
                  ),
                })
              },

              // Restore the original appearance when the cursor leaves.
              mouseout: () => {
                layer.setStyle(getCountryStyle(feature))
              },
            })

            // Keep the existing quiz click behavior.
            if (
              interactive &&
              !awaitingAcknowledgment &&
              featureContinent === selectedContinent &&
              (!quizLocation || !correctCountries.includes(countryName))
            ) {
              layer.on({
                click: () => {
                  onCountryClick(countryName, quizLocation)
                },
              })
            }
          }}
        />
      )}
    </MapContainer>
  )
}

function App() {
  const [countries, setCountries] = useState(null)
  const [currentPage, setCurrentPage] = useState('home')
  const [selectedContinent, setSelectedContinent] = useState('')

  const [currentCountry, setCurrentCountry] = useState(null)
  const [remainingCountries, setRemainingCountries] = useState([])
  const [correctCountries, setCorrectCountries] = useState([])

  // Tracks learned countries across quizzes during this application session.
  const [learnedCountries, setLearnedCountries] = useState([])

  const [incorrectCountry, setIncorrectCountry] = useState(null)
  const [skippedCountry, setSkippedCountry] = useState(null)
  const [awaitingAcknowledgment, setAwaitingAcknowledgment] = useState(false)

  const [score, setScore] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [quizStarted, setQuizStarted] = useState(false)

  // Separates French territories and combines Guadeloupe's islands.
  const splitFrance = (data) => {
    const newFeatures = []
    const guadeloupePolygons = []

    data.features.forEach((feature) => {
      if (feature.properties.ADMIN === 'France') {
        feature.geometry.coordinates.forEach((polygon, index) => {
          let pieceName = 'France'

          if (index === 5) {
            pieceName = 'Martinique'
          } else if ([6, 7, 8].includes(index)) {
            guadeloupePolygons.push(polygon)
            return
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

        // All three Guadeloupe islands become one quiz feature.
        newFeatures.push({
          ...feature,
          properties: {
            ...feature.properties,
            ADMIN: 'Guadeloupe',
          },
          geometry: {
            type: 'MultiPolygon',
            coordinates: guadeloupePolygons,
          },
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

  // Separates Saba and Sint Eustatius from the Netherlands.
  const splitNetherlands = (data) => {
    const newFeatures = []

    data.features.forEach((feature) => {
      if (feature.properties.ADMIN === 'Netherlands') {
        const remainingPolygons = []

        feature.geometry.coordinates.forEach((polygon, index) => {
          let pieceName = null

          if (index === 10) {
            pieceName = 'Sint Eustatius'
          } else if (index === 11) {
            pieceName = 'Saba'
          }

          if (pieceName) {
            newFeatures.push({
              ...feature,
              properties: {
                ...feature.properties,
                ADMIN: pieceName,
                IS_QUIZ_LOCATION: false,
              },
              geometry: {
                type: 'MultiPolygon',
                coordinates: [polygon],
              },
            })
          } else {
            remainingPolygons.push(polygon)
          }
        })

        // Keep the rest of the Netherlands together in Europe.
        newFeatures.push({
          ...feature,
          geometry: {
            type: 'MultiPolygon',
            coordinates: remainingPolygons,
          },
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
        const franceUpdated = splitFrance(data)
        const finalData = splitNetherlands(franceUpdated)
        setCountries(finalData)
      })
  }, [])

  // Opens the selected continent's quiz screen.
  const openQuiz = (continent) => {
    setSelectedContinent(continent)
    setCurrentCountry(null)
    setRemainingCountries([])
    setCorrectCountries([])
    setIncorrectCountry(null)
    setSkippedCountry(null)
    setAwaitingAcknowledgment(false)
    setFeedback('')
    setScore(0)
    setQuizStarted(false)
    setCurrentPage('quiz')
  }

  // Returns the player to the homepage.
  const returnHome = () => {
    setCurrentPage('home')
    setCurrentCountry(null)
    setRemainingCountries([])
    setIncorrectCountry(null)
    setSkippedCountry(null)
    setAwaitingAcknowledgment(false)
    setFeedback('')
    setQuizStarted(false)
  }

  // Starts a fresh quiz.
  const startQuiz = () => {
    if (!countries) return

    const continentCountries = countries.features.filter(
      (feature) =>
        getFeatureContinent(feature) === selectedContinent &&
        isQuizLocation(feature)
    )

    if (continentCountries.length === 0) {
      setFeedback(`No locations were found for ${selectedContinent}.`)
      return
    }

    setRemainingCountries(continentCountries)
    setCorrectCountries([])
    setIncorrectCountry(null)
    setSkippedCountry(null)
    setAwaitingAcknowledgment(false)
    setScore(0)
    setFeedback('')
    setQuizStarted(true)

    const randomCountry = getRandomCountry(continentCountries)
    setCurrentCountry(randomCountry.properties.ADMIN)
  }

  // Checks the player's map selection.
  const checkAnswer = (countryName) => {
    if (!currentCountry || awaitingAcknowledgment) return

    if (countryName === currentCountry) {
      const updatedCorrectCountries = [
        ...correctCountries,
        countryName,
      ]

      setCorrectCountries(updatedCorrectCountries)

      // Save the country as learned for the homepage map.
      setLearnedCountries((previousCountries) => {
        if (previousCountries.includes(countryName)) {
          return previousCountries
        }

        return [...previousCountries, countryName]
      })

      setIncorrectCountry(null)
      setScore((previousScore) => previousScore + 1)

      // Remove the correctly identified country from the question pool.
      const updatedRemainingCountries = remainingCountries.filter(
        (feature) => feature.properties.ADMIN !== currentCountry
      )

      setRemainingCountries(updatedRemainingCountries)

      // Check whether every country has been identified.
      if (updatedRemainingCountries.length === 0) {
        setCurrentCountry(null)
        setFeedback('Quiz complete! You identified every location.')
        return
      }

      // Automatically select another random country.
      const nextCountry = getRandomCountry(updatedRemainingCountries)
      setCurrentCountry(nextCountry.properties.ADMIN)
      setFeedback('')
    } else {
      setIncorrectCountry(countryName)
      setFeedback(`Not quite. You clicked ${countryName}. Try again!`)
    }
  }

  // Handles both quiz countries and read-only locations.
  const handleMapClick = (countryName, quizLocation) => {
    if (!quizLocation) {
      setFeedback(
        `${countryName} is a map location, not a quiz question.`
      )
      return
    }

    checkAnswer(countryName)
  }

  // Skips the current question and reveals its correct location.
  const skipQuestion = () => {
    if (!currentCountry || awaitingAcknowledgment) return

    setSkippedCountry(currentCountry)
    setIncorrectCountry(null)
    setAwaitingAcknowledgment(true)
    setFeedback(`This is ${currentCountry}. Take a moment to study its location.`)
  }

  // Acknowledges the skipped country and moves to another question.
  const continueQuiz = () => {
    if (!awaitingAcknowledgment) return

    // Keep the skipped country in the question pool.
    // Choose another country first if one is available.
    const otherCountries = remainingCountries.filter(
      (feature) => feature.properties.ADMIN !== skippedCountry
    )

    const nextCountry = otherCountries.length > 0
      ? getRandomCountry(otherCountries)
      : getRandomCountry(remainingCountries)

    setCurrentCountry(nextCountry.properties.ADMIN)
    setSkippedCountry(null)
    setIncorrectCountry(null)
    setAwaitingAcknowledgment(false)
    setFeedback('')
  }

  return (
    <div className="app">
      <header>
        <h1>GeoFill</h1>
        <p>Fill the Map. Learn the World.</p>
      </header>

      <main>
        {currentPage === 'home' ? (
          <>
            <div className="game-info">
              <h2>World Map</h2>
              <p>
                Choose a continent below to start practicing.
              </p>
            </div>

            <div className="map-container">
              {countries && (
                <WorldMap
                  countries={countries}
                  currentCountry={null}
                  correctCountries={learnedCountries}
                  incorrectCountry={null}
                  skippedCountry={null}
                  selectedContinent=""
                  interactive={false}
                  awaitingAcknowledgment={false}
                />
              )}
            </div>

            <div className="continent-selection">
              <h2>Choose a Continent</h2>

              <div className="continent-buttons">
                {continents.map((continent) => (
                  <button
                    key={continent}
                    onClick={() => openQuiz(continent)}
                  >
                    {continent}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="game-info">
              <h2>{selectedContinent} Quiz</h2>
              <p>
                Identify the locations in {selectedContinent}.
              </p>

              <div className="score">
                Score: {score}
              </div>
            </div>

            <div className="map-container">
              {countries && (
                <WorldMap
                  countries={countries}
                  currentCountry={currentCountry}
                  correctCountries={correctCountries}
                  incorrectCountry={incorrectCountry}
                  skippedCountry={skippedCountry}
                  selectedContinent={selectedContinent}
                  interactive={true}
                  awaitingAcknowledgment={awaitingAcknowledgment}
                  onCountryClick={handleMapClick}
                />
              )}
            </div>

            <div className="question">
              {!quizStarted ? (
                <h2>Ready to play?</h2>
              ) : awaitingAcknowledgment ? (
                <h2>Skipped: {skippedCountry}</h2>
              ) : currentCountry ? (
                <h2>Find: {currentCountry}</h2>
              ) : (
                <h2>Quiz Complete!</h2>
              )}

              {feedback && (
                <p className="feedback">
                  {feedback}
                </p>
              )}

              <div className="quiz-buttons">
                {!quizStarted && (
                  <button onClick={startQuiz}>
                    Start Quiz
                  </button>
                )}

                {quizStarted && currentCountry && !awaitingAcknowledgment && (
                  <button
                    className="home-button"
                    onClick={skipQuestion}
                  >
                    Skip Question
                  </button>
                )}

                {awaitingAcknowledgment && (
                  <button onClick={continueQuiz}>
                    Continue Quiz
                  </button>
                )}

                <button
                  className="home-button"
                  onClick={returnHome}
                >
                  Quit to Homepage
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
