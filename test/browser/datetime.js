describe("Date Time input field with dMY pattern", function() {
  var field = document.querySelector(".input-date-time");
  var cleave = new Cleave(field, {
    dateTime: true,
    dateTimePattern: ["d", "M", "Y"], // Date's default pattern
    delimiter: "/"
  });

  it("should format fully matched input value", function() {
    cleave.setRawValue("11041965");
    assert.equal(field.value, "11/04/1965");
  });

  it("should format partially matched input value", function() {
    cleave.setRawValue("1207");
    assert.equal(field.value, "12/07/");
  });

  it("should correct large day values to 31", function() {
    cleave.setRawValue("33");
    assert.equal(field.value, "31/");
  });

  it("should correct large (>4) day to add leading 0", function() {
    cleave.setRawValue("4");
    assert.equal(field.value, "04/");
  });

  it("should correct large month to 12", function() {
    cleave.setRawValue("1214");
    assert.equal(field.value, "12/12/");
  });

  it("should correct large month to add leading 0", function() {
    cleave.setRawValue("127");
    assert.equal(field.value, "12/07/");
  });
});

describe("Date input field with pattern YMd pattern (4-digit year)", function() {
  var field = document.querySelector(".input-date-time");
  var cleave = new Cleave(field, {
    date: true,
    datePattern: ["Y", "m", "d"]
  });

  it("should format fully matched input value", function() {
    cleave.setRawValue("19650411");
    assert.equal(field.value, "1965/04/11");
  });
});

describe("Date input field with pattern yMd pattern (2-digit year)", function() {
  var field = document.querySelector(".input-date-time");
  var cleave = new Cleave(field, {
    date: true,
    datePattern: ["y", "m", "d"]
  });

  it("should format fully matched input value", function() {
    cleave.setRawValue("650411");
    assert.equal(field.value, "65/04/11");
  });
});

describe("ISO date", function() {
  var field = document.querySelector(".input-date-time");
  var cleave = new Cleave(field, {
    date: true,
    datePattern: ["m", "Y", "d"]
  });

  it("should get correct ISO date", function() {
    cleave.setRawValue("04196511");
    assert.equal(cleave.getISOFormatDate(), "1965-04-11");
  });
});

describe("DateTime input field for time only pattern", function() {
  var field = document.querySelector(".input-date-time");
  var cleave = new Cleave(field, {
    dateTime: true,
    dateTimePattern: ["h", "m", "s"],
    delimiter: ":",
    delimiters: []
  });

  it("should format fully matched input value", function() {
    cleave.setRawValue("231515");
    assert.equal(field.value, "23:15:15");
  });

  it("should format partially matched input value", function() {
    cleave.setRawValue("2315");
    assert.equal(field.value, "23:15:");
  });

  it("should correct large time hour to 23", function() {
    cleave.setRawValue("25");
    assert.equal(field.value, "23:");
  });

  it("should correct large time hour to add leading 0", function() {
    cleave.setRawValue("4");
    assert.equal(field.value, "04:");
  });

  it("should correct large min to add leading 0", function() {
    cleave.setRawValue("147");
    assert.equal(field.value, "14:07:");
  });

  it("should correct large sec to add leading 0", function() {
    cleave.setRawValue("14147");
    assert.equal(field.value, "14:14:07");
  });
});

describe("DateTime input field with mm:ss pattern", function() {
  var field = document.querySelector(".input-time");
  var cleave = new Cleave(field, {
    dateTime: true,
    dateTimePattern: ["m", "s"],
    delimiter: ":",
    delimiters: []
  });

  it("should format fully matched input value", function() {
    cleave.setRawValue("5555");
    assert.equal(field.value, "55:55");
  });
});

describe("DateTime ISO time only", function() {
  var field = document.querySelector(".input-time");
  var cleave = new Cleave(field, {
    dateTime: true,
    dateTimePattern: ["h", "m", "s"],
    delimiter: ":",
    delimiters: []
  });

  it("should get correct ISO time", function() {
    cleave.setRawValue("808080");
    assert.equal(cleave.getISOFormatTime(), "08:08:08");
  });

  it("should get correct ISO time", function() {
    cleave.setRawValue("8080");
    assert.equal(cleave.getISOFormatTime(), "08:08:00");
  });

  it("should fill in large values and get correct ISO time", function() {
    cleave.setRawValue("789");
    assert.equal(cleave.getISOFormatTime(), "07:08:09");
  });

  it("should respect zero-pad the hour", function() {
    cleave.setRawValue("7");
    assert.equal(field.value, "07:");
  });

  it("should respect changes to the state", function() {
    cleave.setRawValue("789");
    cleave.setRawValue("78");
    cleave.setRawValue("7");
    assert.equal(field.value, "07:");
  });
});

describe("DateTime ISO date and time", function() {
  var field = document.querySelector(".input-time");
  var cleave = new Cleave(field, {
    dateTime: true,
    dateTimePattern: ["M", "d", "Y", "h", "m", "s"],
    delimiters: ["/", "/", " ", ":", ":"]
  });

  it("should get correct ISO date and time", function() {
    cleave.setRawValue("12311980808080");
    assert.equal(cleave.getISOFormatDateTime(), "1980-12-31 08:08:08");
  });

  it("should get correct ISO date when only date has been supplied", function() {
    cleave.setRawValue("12311980");
    assert.equal(cleave.getISOFormatDateTime(), "1980-12-31");
  });

  it("should fill in large values and get correct ISO time", function() {
    cleave.setRawValue("88771990789");
    assert.equal(cleave.getISOFormatDateTime(), "1990-08-07 07:08:09");
  });

  it("should respect zero-pad the hour", function() {
    cleave.setRawValue("7");
    assert.equal(field.value, "07/");
  });
});
