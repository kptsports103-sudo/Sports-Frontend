// src/components/Footer/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import "./Footer.css";
import FeedbackWidget from "./FeedbackWidget";
import VisitorCounter from "./VisitorCounter";
import {
  FaCheckCircle,
  FaSitemap,
  FaQuestionCircle,
  FaVolumeUp,
  FaClipboardList,
  FaUniversity,
  FaUserGraduate,
  FaPhoneAlt,
  FaEnvelope
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">
      {/* Info Bar */}
      <div className="footer-info">
        <span>Last Updated: 2026</span>
        <VisitorCounter />
        <span>Version: KPT Sports Website 1.0</span>
      </div>

      {/* Institute + Developer Section */}
      <div className="footer-institute-grid">
        {/* LEFT */}
        <div className="footer-meta">
          <p className="footer-heading">
            <FaUniversity /> KARNATAKA (GOVT.) POLYTECHNIC, MANGALORE
          </p>
          <p className="footer-sub">
            (An Autonomous Institution Under AICTE, New Delhi)
          </p>

          <p><strong>Project:</strong> KPT Sports Website</p>
          <p><strong>Department:</strong> Computer Science & Engineering (CSE)</p>
          <p><strong>Semester:</strong> Diploma - 6th Semester</p>
        </div>

        {/* RIGHT */}
        <div className="footer-developer">
          <p className="footer-heading">
            <FaUserGraduate /> Developed By: <strong>D. Yashawantha Reddy</strong>
          </p>
          <p>Diploma CSE Student</p>
          <p><FaPhoneAlt /> Mobile: +91 XXXXX XX195</p>
          <p><FaEnvelope /> yashwanth@kpt.edu</p>
          <p><strong>Website Launch:</strong> 2026</p>
        </div>
      </div>

      {/* Lower Section */}
      <div className="footer-container">
        {/* Disclaimer */}
        <div className="footer-box">
          <h4 className="footer-title">Disclaimer</h4>
          <p>
            This website is developed as a student academic project. The
            information provided is related to sports activities of KPT and is
            for informational and educational purposes only.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-box">
          <h4 className="footer-title">Quick Links</h4>
          <ul className="footer-list">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/sports-celebration?tab=events">Events</Link></li>
            <li><Link to="/archive">Archive</Link></li>
            <li><Link to="/players">Players</Link></li>
            <li><Link to="/gallery">Gallery</Link></li>
            <li><Link to="/winners">Winners</Link></li>
            <li><Link to="/points-table">Points Table</Link></li>
            <li><Link to="/results">Results</Link></li>
          </ul>
        </div>

        {/* Policies */}
        <div className="footer-box">
          <h4 className="footer-title">Website Policies & Guidelines</h4>
          <ul className="footer-list">
            {[
              "Copyright Policy",
              "Hyperlinking Policy",
              "Security Policy",
              "Terms & Conditions",
              "Privacy Policy"
            ].map((item, i) => (
              <li key={i}>
                <FaCheckCircle /> <button className="footer-link">{item}</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Accessibility */}
        <div className="footer-box">
          <h4 className="footer-title">Accessibility Resources</h4>
          <ul className="footer-list">
            <li><FaSitemap /> <button className="footer-link">Sitemap</button></li>
            <li><FaQuestionCircle /> <button className="footer-link">Help</button></li>
            <li><FaVolumeUp /> <button className="footer-link">Screen Reader Access</button></li>
            <li><FaClipboardList /> <button className="footer-link">Guidelines</button></li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        Designed, Developed & Hosted by KPT 2026. All Rights Reserved.
      </div>

      {/* Feedback Button */}
      <FeedbackWidget
        title="Share Your Feedback"
        description="We value your thoughts and suggestions about the KPT Sports website."
        contextLabel="Website Feedback"
        triggerLabel="Feedback"
        triggerClassName="feedback-btn"
        useDefaultTriggerStyles={false}
        showTriggerIcon={false}
      />
    </footer>
  );
};

export default Footer;
