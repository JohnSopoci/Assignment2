(function () {
  "use strict()";

  // we are going to store data in the broser's local storage
  // which is accessed using the localStorage API
  // We need to give this storage a name;
  const STORAGE_KEY = "puslecare_triage_records_v1";

  // Bring in the DOM elements and store it as JS objects
  // use the document API

  // const vitalsForm = document.querySelectorAll(".test")
  const vitalsForm = document.getElementById("Greenhouse-Form");
  const errorBanner = document.getElementById("form-error-banner");
  const recordsList = document.getElementById("records-list");
  const queueCount = document.getElementById("queue-count");
  const emptyState = document.getElementById("empty-state");
  const btnClearAll = document.getElementById("btn-clear-all");

  // grab the input field within the html form
  const inputName = document.getElementById("greenhouse-id");
  const inputElectric = document.getElementById("EC");
  const inputpH = document.getElementById("pH");
  const inputTemperature = document.getElementById("Temperature");
  const inputHumidity = document.getElementById("Humidity");

  // initial the state
  // (condition) ? (true) : (false);

  let records = loadRecords();

  // initial UI call/ render
  render();

  //   STORAGE OPS: READ AND WRITE TO STORE

  //   READ operations
  function loadRecords() {
    try {
      // establish connection with your data store
      const stored = localStorage.getItem(STORAGE_KEY);
      // check if anything was returned or if store is empty
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Failed to load records from your data store", error);
      return [];
    }
  }

  //   WRITE operation to the data store
  function saveRecords() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error("Failed to write to your data store", error);
    }
  }

  // procsesing logic - to create dynamic badges for classification
  function evaluateRisk(Electric, pH, Temperature, Humidity) {
    if (
      Electric < 0.2 &&
      Electric > 4.5 &&
      pH > 7.5 &&
      pH < 5.0 &&
      Humidity < 30 &&
      Humidity > 90 &&
      Temperature > 95 &&
      Temperature < 55
    ) {
      return { level: "critical", label: "Critical" };
    }
    if (
      1.0 <= Electric &&
      Electric <= 2.0 &&
      5.5 <= pH &&
      pH <= 6.5 &&
      64.4 <= Temperature &&
      Temperature <= 71.6 &&
      50 <= Humidity &&
      Humidity <= 70
    ) {
      return { level: "Optimal", label: "Optimal" };
    }
    return { level: "Warning", label: "Warning" };
  }

  // INput form validation:
  function validateInput(data) {
    const errors = [];

    // start the error validation
    if (!data.name.trim()) {
      errors.push("Greenhouse ID is a required Field");
    }
    if (isNaN(data.Electric) || data.Electric < 0.0 || data.Electric > 260) {
      errors.push(
        "Electric Conductivity must be a number and between 0.0 to 260 mS/cm",
      );
    }
    if (isNaN(data.pH) || data.pH < 0.0 || data.pH > 10.0) {
      errors.push("pH must be a number and between 0.0 to 10.0");
    }
    if (
      isNaN(data.Temperature) ||
      data.Temperature < 30 ||
      data.Temperature > 240
    ) {
      errors.push("Air Temperature must be a number and between 30 to 240 °F");
    }
    if (isNaN(data.Humidity) || data.Humidity < 0.0 || data.Humidity > 100) {
      errors.push(
        "Relative Humidity must be a number and between 0.0 to 100 %",
      );
    }

    return errors;
  }

  vitalsForm.addEventListener("submit", (event) => {
    event.preventDefault(); // relevent to web forms s.t. they don't reload on submission

    const formData = {
      id: crypto.randomUUID(),
      name: inputName.value,
      Electric: parseInt(inputElectric.value, 10),
      pH: parseInt(inputpH.value, 10),
      Temperature: parseInt(inputTemperature.value, 10),
      Humidity: parseInt(inputHumidity.value, 10),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const validationErrors = validateInput(formData);

    if (validationErrors.length > 0) {
      displayError(validationErrors.join(" "));
      return;
    }

    hideError();

    // classify risk level
    formData.risk = evaluateRisk(
      formData.Electric,
      formData.pH,
      formData.Temperature,
      formData.Humidity,
    );

    // add this to our records array that is keeping track of all user input for patients
    records.unshift(formData);

    // commit this to the memory
    saveRecords();
    render();

    // reset the user form after data is committed to data store
    vitalsForm.reset();

    // bring the input focus to the first input field - such that user can enter a new patient
    inputName.focus();
  });

  // Pattern: Event Delegation (implemented using Event Bubbling).
  // Instead of adding listeners to every button, one listener is placed on the parent.
  // When a child button is clicked, the event bubbles up to the parent.
  // event.target identifies the exact clicked element and its data-id attribute.
  recordsList.addEventListener("click", function (event) {
    // identify which patient card's delete btn was clicked
    const target = event.target;
    if (target.classList.contains("btn-discharge")) {
      const recordId = target.dataset.id;
      records = records.filter(function (record) {
        return record.id !== recordId;
      });
      saveRecords();
      render();
    }
  });

  // delete all event
  btnClearAll.addEventListener("click", (event) => {
    if (records.length === 0) return;
    if (confirm("Are you sure you want to delete all Greenhouse records?")) {
      records = [];
      saveRecords();
      render();
    }
  });

  //   DOM RENDER FUNCTION BODY
  function render() {
    queueCount.textContent = records.length;

    // 1 == 1; "1" === 1
    if (records.length === 0) {
      emptyState.classList.remove("hidden");
      recordsList.innerHTML = "";
      return;
    }

    // if not emppty
    emptyState.classList.add("hidden");

    // create a virtual DOM.
    // minimizes browser reloads
    const fragment = document.createDocumentFragment();

    // for each item in the records create the patient cards
    records.forEach(function (rec) {
      const li = document.createElement("li");
      li.className = "patient-card status-" + rec.risk.level;

      // create our dynamic card <img src=x onerror='query to retrieve data'>
      //
      li.innerHTML = `<div class="card-top">
            <div>
                <div class="patient-name-text">${escapeHtml(rec.name)} </div>
                <div class="timestamp">Logged at ${rec.timestamp} </div> 
                <span class="risk-badge ${rec.risk.level}">${rec.risk.label}</span>            
            </div>
            <div class="vital-stats">
              <div class="stat-item"><span>Electric Conductivity</span>${rec.Electric} mS/cm </div>
              <div class="stat-item"><span>pH</span>${rec.pH} </div>
              <div class="stat-item"><span>Air Temperature</span>${rec.Temperature.toFixed(1)} °F </div>
              <div class="stat-item"><span>Relative Humidity</span>${rec.Humidity}% </div>
            </div>
            <button class="btn btn-outline-danger btn-sm btn-discharge" data-id="${rec.id}">Discharge Greenhouse </button>        
        </div>`;

      // add the above html to the vritual dom
      fragment.appendChild(li);
    });

    // reset the UI
    recordsList.innerHTML = "";
    // add the docu fragment to the REaL dom
    recordsList.appendChild(fragment);
  }

  // dynamically show error msg
  function displayError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove("hidden");
  }

  // dynamically hide the error msg on correct input
  function hideError() {
    errorBanner.textContent = "";
    errorBanner.classList.add("hidden");
  }

  // escape html function - this is to sanitize your user
  // input such that they are unable to inject malicious code
  function escapeHtml(str) {
    // replace & < > :- do this globally across all codes
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
})();
