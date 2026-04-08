import { useEffect, useState } from "react";
import axios from "axios";
import { buildBackendUrl } from "../utils/backendUrl";

export default function VisitorCounter() {
  const [today, setToday] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get visitor count (increments today's count)
    axios.get(buildBackendUrl("/api/visitor/count"))
      .then(res => {
        setToday(res.data.today || 0);
        setTotal(res.data.total || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error getting visitor count:", err);
        // Set fallback values
        setToday(0);
        setTotal(0);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <span>Visitors: Loading...</span>;
  }

  return (
    <>
      <span>Today: {today}</span>
      <span style={{ margin: "0 8px" }}>|</span>
      <span>Total: {total}</span>
    </>
  );
}
