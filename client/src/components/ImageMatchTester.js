import React, { useState } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config';
import './ImageMatchTester.css';

const ImageMatchTester = () => {
  const [photo1, setPhoto1] = useState(null);
  const [photo2, setPhoto2] = useState(null);
  const [similarityScore, setSimilarityScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handlePhoto1Change = (event) => {
    const file = event.target.files[0];
    setPhoto1(file);
    setMessage('');
    setSimilarityScore(null);
  };

  const handlePhoto2Change = (event) => {
    const file = event.target.files[0];
    setPhoto2(file);
    setMessage('');
    setSimilarityScore(null);
  };

  const handleTestSimilarity = async () => {
    if (!photo1 || !photo2) {
      setMessage('Please select both photos');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('photo1', photo1);
      formData.append('photo2', photo2);

      const response = await axios.post(buildApiUrl('/api/test-image-similarity'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setSimilarityScore(response.data.similarityScore);
        setMessage(`Similarity test completed! Score: ${(response.data.similarityScore * 100).toFixed(2)}%`);
      } else {
        setMessage(response.data.error || 'Test failed');
      }
    } catch (error) {
      console.error('Error testing image similarity:', error);
      setMessage(error.response?.data?.error || 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 0.8) return '#28a745'; // Green - High similarity
    if (score >= 0.6) return '#ffc107'; // Yellow - Medium similarity
    return '#dc3545'; // Red - Low similarity
  };

  const getSimilarityLabel = (score) => {
    if (score >= 0.8) return 'High Similarity';
    if (score >= 0.6) return 'Medium Similarity';
    return 'Low Similarity';
  };

  return (
    <div className="image-match-tester">
      <div className="card">
        <h3>Image Similarity Tester</h3>
        <p>Test the image matching algorithm by comparing two photos</p>
      </div>

      <div className="card">
        <h4>Select Photos to Compare</h4>
        
        <div className="photo-selection">
          <div className="photo-input">
            <label>Photo 1:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto1Change}
              className="form-control"
            />
            {photo1 && (
              <div className="photo-preview">
                <img 
                  src={URL.createObjectURL(photo1)} 
                  alt="Photo 1 preview" 
                  className="preview-image"
                />
                <p className="photo-name">{photo1.name}</p>
              </div>
            )}
          </div>

          <div className="photo-input">
            <label>Photo 2:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto2Change}
              className="form-control"
            />
            {photo2 && (
              <div className="photo-preview">
                <img 
                  src={URL.createObjectURL(photo2)} 
                  alt="Photo 2 preview" 
                  className="preview-image"
                />
                <p className="photo-name">{photo2.name}</p>
              </div>
            )}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleTestSimilarity}
          disabled={!photo1 || !photo2 || loading}
        >
          {loading ? 'Testing...' : 'Test Similarity'}
        </button>

        {message && (
          <div className={`message ${similarityScore !== null ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        {similarityScore !== null && (
          <div className="similarity-results">
            <h4>Similarity Results</h4>
            <div 
              className="similarity-score"
              style={{ color: getSimilarityColor(similarityScore) }}
            >
              <span className="score-value">{(similarityScore * 100).toFixed(2)}%</span>
              <span className="score-label">{getSimilarityLabel(similarityScore)}</span>
            </div>
            
            <div className="similarity-details">
              <p><strong>Raw Score:</strong> {similarityScore.toFixed(4)}</p>
              <p><strong>Interpretation:</strong></p>
              <ul>
                <li><span style={{color: '#28a745'}}>≥ 80% (0.8):</span> High similarity - likely a match</li>
                <li><span style={{color: '#ffc107'}}>60-79% (0.6-0.79):</span> Medium similarity - possible match</li>
                <li><span style={{color: '#dc3545'}}>&lt; 60% (0.6):</span> Low similarity - unlikely to match</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h4>How It Works</h4>
        <p>The image similarity algorithm:</p>
        <ol>
          <li>Resizes both images to 200x200 pixels</li>
          <li>Converts them to grayscale</li>
          <li>Extracts SIFT features from both images</li>
          <li>Compares feature descriptors using FLANN matcher</li>
          <li>Calculates similarity score based on good feature matches</li>
          <li>Returns a similarity score from 0.0 to 1.0</li>
        </ol>
        <p><strong>Current threshold:</strong> 0.8 (80%) - photos must score 80% or higher to be considered a match.</p>
        <p><strong>Note:</strong> This uses OpenCV.js with SIFT feature matching for accurate image comparison.</p>
      </div>
    </div>
  );
};

export default ImageMatchTester; 