import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import axios from "axios";
import { buildBackendUrl } from "../../utils/backendUrl";

export default function DailyVisitorsChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch daily visitors data
    axios.get(buildBackendUrl("/api/visitor/daily"))
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching visitor stats:", err);
        setLoading(false);
      });
  }, []);

  // Format date for display (YYYY-MM-DD -> MM/DD)
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Format data for chart
  const chartData = data.map(item => ({
    ...item,
    displayDate: formatDate(item.date)
  }));

  if (loading) {
    return (
      <div style={styles.card}>
        <h3 style={styles.title}>Daily Visitors</h3>
        <div style={styles.loading}>Loading chart data...</div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Daily Visitors</h3>
      
      {data.length === 0 ? (
        <div style={styles.noData}>No visitor data available</div>
      ) : (
        <div style={{ width: "100%", minWidth: 0, minHeight: 300 }}>
          <ResponsiveContainer width="100%" height={300} minWidth={0} debounce={100}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="displayDate" 
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              allowDecimals={false}
              stroke="#666"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
              formatter={(value, name) => [value, 'Visitors']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#1f4e79"
              strokeWidth={3}
              dot={{ r: 4, fill: '#1f4e79' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
    marginBottom: "20px"
  },
  title: {
    margin: "0 0 15px 0",
    color: "#1f4e79",
    fontSize: "18px",
    fontWeight: "600"
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "300px",
    color: "#666",
    fontSize: "14px"
  },
  noData: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "300px",
    color: "#666",
    fontSize: "14px"
  }
};
