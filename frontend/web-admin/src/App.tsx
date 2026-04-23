import { useEffect, useState } from "react";
import { getWeather, type Weather } from "./services/api";

function App() {
  const [data, setData] = useState<Weather[]>([]);

  useEffect(() => {
    getWeather()
      .then(setData)
      .catch((err) => console.error(err));
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Datos desde backend</h1>

      {data.length === 0 ? (
        <p>Cargando...</p>
      ) : (
        <ul>
          {data.map((item, index) => (
            <li key={index}>
              {item.date} - {item.temperatureC}°C - {item.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
