interface UserLocationCoords {
  latitude: number;
  longitude: number;
}
interface UserLocation {
  coords: UserLocationCoords;
}

describe("share location", () => {
  beforeEach(() => {
    // initialize clock for later ticks
    cy.clock();
    // get user location data from fixture
    cy.fixture("user-location.json").as("fakeUserLocation");
    cy.get("@fakeUserLocation").then((location: any) => {
      cy.visit("/").then((win) => {
        // mock the browser's location function
        cy.stub(win.navigator.geolocation, "getCurrentPosition")
          .as("mockGetCurrentPosition")
          .callsFake((callback) => {
            setTimeout(() => {
              callback(location);
            }, 100);
          });
        // mock the browser's Copy-To-Clipboard function
        cy.stub(win.navigator.clipboard, "writeText").as("mockWriteText").resolves();
        // spy on local storage calls
        cy.spy(win.localStorage, "setItem").as("localStorageSetItem");
        cy.spy(win.localStorage, "getItem").as("localStorageGetItem");
      });
    });
  });

  it("should fetch the user location", () => {
    cy.get('[data-cy="get-loc-btn"]').click();
    // check whether function has been called
    cy.get("@mockGetCurrentPosition").should("have.been.called");
    // check whether button has been disabled
    cy.get('[data-cy="get-loc-btn"]').should("be.disabled");
    cy.get("[data-cy='actions']").should("contain", "Location fetched");
  });

  it("should share a location URL", () => {
    // enter a name
    cy.get('[data-cy="name-input"]').type("Hansi");
    // click fetch location button
    cy.get('[data-cy="get-loc-btn"]').click();
    // click the Shar Location button
    cy.get('[data-cy="share-loc-btn"]').click();
    // check whether the Clipboard function has been called
    cy.get("@mockWriteText").should("have.been.called");
    cy.get("@fakeUserLocation").then((location: any) => {
      const { latitude, longitude } = location.coords;
      cy.get("@mockWriteText").should("have.been.calledWithMatch", new RegExp(`${latitude}.*${longitude}.*${encodeURI("Hansi")}`));
    });
    // check whether info message is displayed ... and disappears after 2 seconds
    cy.get('[data-cy="info-message"] > p').should("contain", "Location URL copied");
    // move forward 2 seconds
    cy.tick(2000);
    cy.get('[data-cy="info-message"]').should("not.be.visible");
    // check whether item has been stored on local storage
    cy.get("@localStorageSetItem").should("have.been.called");
    // check whether item has been read from local storage in case the Share Location button is pressed again
    cy.get('[data-cy="share-loc-btn"]').click();
    cy.get("@localStorageGetItem").should("have.been.called");
  });

  const mockGetCurrentPosition = (callback: Function, userLocation: UserLocation) => {
    // make sure there is enough time to disable the button
    setTimeout(() => {
      callback(userLocation);
    }, 100);
  };

  const mockWriteText = () => {};
});
