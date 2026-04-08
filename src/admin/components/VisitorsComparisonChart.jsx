import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import axios from "axios";
import { buildBackendUrl } from "../../utils/backendUrl";

export default function VisitorsComparisonChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch daily + total visitors comparison data
    axios.get(buildBackendUrl("/api/visitor/daily-total"))
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching visitor comparison data:", err);
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
        <h3 style={styles.title}>Daily vs Total Visitors</h3>
        <div style={styles.loading}>Loading comparison data...</div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.title}>Daily vs Total Visitors</h3>
      
      {data.length === 0 ? (
        <div style={styles.noData}>No visitor data available</div>
      ) : (
        <div style={{ width: "100%", minWidth: 0, minHeight: 320 }}>
          <ResponsiveContainer width="100%" height={320} minWidth={0} debounce={100}>
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
              formatter={(value, name) => [
                value, 
                name === 'daily' ? 'Daily Visitors' : 'Total Visitors'
              ]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px'
              }}
            />

            {/* Daily visitors line */}
            <Line
              type="monotone"
              dataKey="daily"
              stroke="#2f6fa3"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2f6fa3' }}
              activeDot={{ r: 6 }}
              name="Daily Visitors"
            />

            {/* Total visitors line */}
            <Line
              type="monotone"
              dataKey="total"
              stroke="#f5c542"
              strokeWidth={3}
              dot={false}
              name="Total Visitors"
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
    height: "320px",
    color: "#666",
    fontSize: "14px"
  },
  noData: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "320px",
    color: "#666",
    fontSize: "14px"
  }
};
