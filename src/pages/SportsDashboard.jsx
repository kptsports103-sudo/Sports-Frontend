import React from 'react';
import './SportsDashboard.css';

export default function SportsDashboard() {
  return (
    <div className="sports-dashboard">

      {/* SIDEBAR */}
      <aside className="sports-dashboard__sidebar">
        <h3>KPT Sports</h3>
        <ul>
          <li>Dashboard</li>
          <li>Events</li>
          <li>Players</li>
          <li>Gallery</li>
          <li>Results</li>
          <li>Logout</li>
        </ul>
      </aside>

      {/* MAIN CONTENT */}
      <main className="sports-dashboard__main">
        <h2>Welcome Back, Sports Admin!</h2>

        <div className="sports-dashboard__cards">
          <div className="sports-dashboard__card sports-dashboard__card--blue">
            <h4>Total Events</h4>
            <p>18</p>
          </div>

          <div className="sports-dashboard__card sports-dashboard__card--red">
            <h4>Players Registered</h4>
            <p>256</p>
          </div>

          <div className="sports-dashboard__card sports-dashboard__card--green">
            <h4>Sports Categories</h4>
            <p>12</p>
          </div>

          <div className="sports-dashboard__card sports-dashboard__card--orange">
            <h4>Gallery Images</h4>
            <p>340</p>
          </div>
        </div>

        <div className="sports-dashboard__actions">
          <button>Add Event</button>
          <button>Upload Results</button>
          <button>Manage Gallery</button>
        </div>
      </main>

    </div>
  );
}
