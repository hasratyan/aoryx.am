type LoaderProps = {
  text?: string;
};

export default function Loader({ text }: LoaderProps) {
  return (
    <div className="loader-container">
      <div className="loader">
        <div className="loader-spinner">
          <span className="material-symbols-rounded">language</span>
          <div className="flight-wrapper">
            <span className="material-symbols-rounded">flight</span>
          </div>
        </div>
        {text && <p className="loader-text">{text}</p>}
      </div>
    </div>
  );
}
