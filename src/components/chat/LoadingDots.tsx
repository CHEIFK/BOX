/** LoadingDots — animated "thinking" indicator */
import './LoadingDots.css';

export default function LoadingDots() {
  return (
    <div className="loading-dots" aria-label="AGY is thinking" role="status">
      <div className="loading-dots__avatar" aria-hidden="true">
        <span>A</span>
      </div>
      <div className="loading-dots__content">
        <div className="loading-dots__meta">
          <span className="loading-dots__role">AGY</span>
        </div>
        <div className="loading-dots__bubble" aria-hidden="true">
          <span className="loading-dots__dot" />
          <span className="loading-dots__dot" />
          <span className="loading-dots__dot" />
        </div>
      </div>
    </div>
  );
}
