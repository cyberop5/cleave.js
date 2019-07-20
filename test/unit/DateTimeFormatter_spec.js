var _ = require("underscore");
var DateFormatter = require("../../src/shortcuts/DateTimeFormatter");
var dateGroups = require("../fixtures/datetime.json");

describe("DateTimeFormatter", function() {
  _.each(dateGroups, function(dateGroup) {
    var boundary = dateGroup.dateMin || dateGroup.dateMax;
    describe(
      "pattern: " +
        dateGroup.dateTimePattern.join(", ") +
        (boundary
          ? " min: " + dateGroup.dateMin + " max: " + dateGroup.dateMax
          : ""),
      function() {
        var dateFormatter = new DateFormatter(
          dateGroup.dateTimePattern,
          dateGroup.dateMin || "",
          dateGroup.dateMax || ""
        );

        _.each(dateGroup.date, function(date) {
          it(
            "should convert date time " + date[0] + " to " + date[1],
            function() {
              dateFormatter.getValidatedDateTime(date[0]).should.eql(date[1]);
            }
          );
        });
      }
    );
  });
});
