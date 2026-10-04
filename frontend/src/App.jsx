import './App.css'

function App() {
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
            Score: 0
          </div>
        </div>

        <div className="map-placeholder">
          <h2>World Map</h2>
          <p>Interactive map goes here</p>
        </div>

        <div className="question">
          <h2>Which country is this?</h2>
          <button>Start Quiz</button>
        </div>
      </main>
    </div>
  )
}

export default App