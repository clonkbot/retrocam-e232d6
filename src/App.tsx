import { useState, useRef, useCallback, useEffect } from 'react';
import './styles.css';

type FilterType = 'none' | 'vintage' | 'sepia' | 'polaroid' | 'noir' | 'faded';

interface Photo {
  id: string;
  dataUrl: string;
  filter: FilterType;
  timestamp: Date;
}

const filters: { name: FilterType; label: string; css: string }[] = [
  { name: 'none', label: 'Natural', css: 'none' },
  { name: 'vintage', label: '70s Film', css: 'sepia(0.3) contrast(1.1) saturate(1.3) brightness(1.05)' },
  { name: 'sepia', label: 'Sepia', css: 'sepia(0.8) contrast(1.1)' },
  { name: 'polaroid', label: 'Polaroid', css: 'contrast(1.1) brightness(1.1) saturate(1.2)' },
  { name: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.3) brightness(0.9)' },
  { name: 'faded', label: 'Faded', css: 'contrast(0.9) saturate(0.8) brightness(1.1)' },
];

function App() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('vintage');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [flashActive, setFlashActive] = useState(false);
  const [filmCount, setFilmCount] = useState(24);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 }
        },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
    } finally {
      setIsLoading(false);
    }
  }, [facingMode, stream]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || filmCount <= 0) return;

    setIsCapturing(true);
    setFlashActive(true);

    setTimeout(() => setFlashActive(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const filterObj = filters.find(f => f.name === currentFilter);
    ctx.filter = filterObj?.css || 'none';

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const newPhoto: Photo = {
      id: Date.now().toString(),
      dataUrl,
      filter: currentFilter,
      timestamp: new Date()
    };

    setPhotos(prev => [newPhoto, ...prev]);
    setFilmCount(prev => prev - 1);

    setTimeout(() => setIsCapturing(false), 300);
  }, [currentFilter, facingMode, filmCount]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const downloadPhoto = useCallback((photo: Photo) => {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `retrocam-${photo.timestamp.getTime()}.jpg`;
    link.click();
  }, []);

  const deletePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    setSelectedPhoto(null);
    setFilmCount(prev => Math.min(prev + 1, 24));
  }, []);

  const currentFilterObj = filters.find(f => f.name === currentFilter);

  return (
    <div className="app-container">
      {/* Flash Effect */}
      <div className={`flash-overlay ${flashActive ? 'active' : ''}`} />

      {/* Camera Body */}
      <div className="camera-body">
        {/* Top Panel */}
        <div className="camera-top-panel">
          <div className="brand-emboss">RETROCAM</div>
          <div className="film-counter">
            <span className="film-label">FILM</span>
            <span className="film-number">{filmCount.toString().padStart(2, '0')}</span>
          </div>
          <div className="hot-shoe" />
        </div>

        {/* Viewfinder Section */}
        <div className="viewfinder-section">
          <div className="viewfinder-frame">
            <div className="viewfinder-inner">
              {isLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner" />
                  <span>Initializing...</span>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`viewfinder-video ${facingMode === 'user' ? 'mirrored' : ''}`}
                  style={{ filter: currentFilterObj?.css }}
                />
              )}
              <canvas ref={canvasRef} className="hidden-canvas" />

              {/* Viewfinder Overlay */}
              <div className="viewfinder-overlay">
                <div className="corner tl" />
                <div className="corner tr" />
                <div className="corner bl" />
                <div className="corner br" />
                <div className="center-mark" />
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="lens-ring" />
          <div className="light-meter">
            <div className="meter-dot active" />
            <div className="meter-dot active" />
            <div className="meter-dot" />
          </div>
        </div>

        {/* Filter Dial */}
        <div className="filter-dial-section">
          <div className="dial-label">MODE</div>
          <div className="filter-dial">
            {filters.map((filter) => (
              <button
                key={filter.name}
                className={`dial-option ${currentFilter === filter.name ? 'active' : ''}`}
                onClick={() => setCurrentFilter(filter.name)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Controls Section */}
        <div className="controls-section">
          {/* Gallery Button */}
          <button
            className="control-button gallery-button"
            onClick={() => setShowGallery(true)}
            disabled={photos.length === 0}
          >
            {photos.length > 0 ? (
              <img src={photos[0].dataUrl} alt="Last photo" className="gallery-preview" />
            ) : (
              <div className="gallery-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
            {photos.length > 0 && (
              <span className="photo-count">{photos.length}</span>
            )}
          </button>

          {/* Shutter Button */}
          <button
            className={`shutter-button ${isCapturing ? 'capturing' : ''}`}
            onClick={capturePhoto}
            disabled={isCapturing || filmCount <= 0 || isLoading}
          >
            <div className="shutter-outer">
              <div className="shutter-inner" />
            </div>
          </button>

          {/* Switch Camera Button */}
          <button
            className="control-button switch-button"
            onClick={switchCamera}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
              <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
              <circle cx="12" cy="12" r="3" />
              <path d="M17 9l3-3-3-3" />
              <path d="M7 15l-3 3 3 3" />
            </svg>
          </button>
        </div>

        {/* Bottom Texture */}
        <div className="camera-bottom">
          <div className="grip-texture">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grip-line" />
            ))}
          </div>
        </div>
      </div>

      {/* Gallery Modal */}
      {showGallery && (
        <div className="gallery-modal" onClick={() => setShowGallery(false)}>
          <div className="gallery-content" onClick={e => e.stopPropagation()}>
            <div className="gallery-header">
              <h2>Your Photos</h2>
              <button className="close-button" onClick={() => setShowGallery(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {photos.length === 0 ? (
              <div className="gallery-empty-state">
                <p>No photos yet</p>
                <span>Start capturing memories!</span>
              </div>
            ) : (
              <div className="gallery-grid">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="gallery-item"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img src={photo.dataUrl} alt="Captured" />
                    <div className="polaroid-border" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <div className="photo-modal" onClick={() => setSelectedPhoto(null)}>
          <div className="photo-detail" onClick={e => e.stopPropagation()}>
            <div className="polaroid-frame">
              <img src={selectedPhoto.dataUrl} alt="Selected" />
              <div className="polaroid-info">
                <span>{selectedPhoto.timestamp.toLocaleDateString()}</span>
                <span>{filters.find(f => f.name === selectedPhoto.filter)?.label}</span>
              </div>
            </div>
            <div className="photo-actions">
              <button onClick={() => downloadPhoto(selectedPhoto)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Save
              </button>
              <button className="delete-btn" onClick={() => deletePhoto(selectedPhoto.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        Requested by <a href="https://twitter.com/aiob_me" target="_blank" rel="noopener noreferrer">@aiob_me</a> · Built by <a href="https://twitter.com/clonkbot" target="_blank" rel="noopener noreferrer">@clonkbot</a>
      </footer>
    </div>
  );
}

export default App;
