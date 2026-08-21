
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import DashboardLayout from '@/components/DashboardLayout.jsx';
import { adminApi } from '@/lib/api.js';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const getIcon = (status) => {
  const color = status === 'resolved' ? 'green' : status === 'assigned' ? 'orange' : 'red';
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const AdminMap = () => {
  const [complaints, setComplaints] = useState([]);
  const defaultPosition = [20.5937, 78.9629]; // India center

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminApi.complaints();
        setComplaints((response.complaints || []).map((c) => ({
          ...c,
          status: String(c.status || '').toLowerCase(),
          location: c.location || { latitude: c.latitude, longitude: c.longitude },
        })));
      } catch {
        setComplaints([]);
      }
    };
    load();
  }, []);

  return (
    <>
      <Helmet>
        <title>Issue Map - CITIFIX</title>
        <meta name="description" content="View all civic issues on an interactive map." />
      </Helmet>
      <DashboardLayout>
        <h1 className="text-3xl font-bold mb-6">Live Issue Map</h1>
        <div className="h-[75vh] w-full bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700">
          <MapContainer center={defaultPosition} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {complaints.map(c => (
              <Marker 
                key={c.id} 
                position={[c.location.latitude, c.location.longitude]}
                icon={getIcon(c.status)}
              >
                <Popup>
                  <h4 className="font-bold">{c.title}</h4>
                  <p>Status: {c.status}</p>
                  <p>Category: {c.category}</p>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AdminMap;
