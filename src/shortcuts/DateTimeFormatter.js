"use strict";

var DateTimeFormatter = function(
  dateTimePattern,
  dateMin,
  dateMax,
  timeFormat
) {
  var owner = this;
  var expectedMinMaxPartsLength = 3;
  owner.date = {
    year: null,
    month: null,
    day: null,
    hour: null,
    minute: null,
    second: null
  };
  owner.blocks = [];
  owner.dateTimePattern = dateTimePattern;
  owner.timeFormat = timeFormat; // '12' or '24'
  owner.dateMin = dateMin

    .split(/[\-\:\sT]/) // split on dash, colon, and space
    .reverse()
    .map(function(x) {
      return parseInt(x, 10);
    });
  while (owner.dateMin.length < expectedMinMaxPartsLength)
    owner.dateMin.unshift(0);

  owner.dateMax = dateMax
    .split(/[\-\:\sT]/) // split on dash, colon, space, and the letter T
    .reverse()
    .map(function(x) {
      return parseInt(x, 10);
    });
  while (owner.dateMax.length < expectedMinMaxPartsLength)
    owner.dateMax.unshift(0);

  owner.initBlocks();
};

DateTimeFormatter.prototype = {
  initBlocks: function() {
    var owner = this;
    owner.dateTimePattern.forEach(function(value) {
      if (value === "Y") {
        owner.blocks.push(4);
      } else {
        owner.blocks.push(2);
      }
    });
  },

  getTimeFormatOptions: function() {
    var owner = this;
    if (String(owner.timeFormat) === "12") {
      return {
        maxHourFirstDigit: 1,
        maxHours: 12,
        maxMinutesFirstDigit: 5,
        maxMinutes: 60
      };
    }

    return {
      maxHourFirstDigit: 2,
      maxHours: 23,
      maxMinutesFirstDigit: 5,
      maxMinutes: 60
    };
  },

  getISOFormatDate: function() {
    var owner = this,
      datetime = owner.datetime;

    return datetime.year
      ? datetime.year +
          "-" +
          owner.addLeadingZero(datetime.month) +
          "-" +
          owner.addLeadingZero(datetime.day)
      : "";
  },

  getISOFormatTime: function() {
    var owner = this,
      datetime = owner.datetime;

    return datetime.hour
      ? owner.addLeadingZero(datetime.hour) +
          ":" +
          owner.addLeadingZero(datetime.minute) +
          ":" +
          owner.addLeadingZero(datetime.second)
      : "";
  },

  getISOFormatDateTime: function() {
    var owner = this,
      datetime = owner.datetime;

    return datetime.year
      ? this.getISOFormatDate() + " " + this.getISOFormatTime()
      : "";
  },

  getBlocks: function() {
    return this.blocks;
  },

  getValidatedDateTime: function(value) {
    var owner = this,
      result = "";
    var timeFormatOptions = owner.getTimeFormatOptions();
    value = value.replace(/[^\d]/g, "");

    owner.blocks.forEach(function(blockLength, index) {
      if (value.length > 0) {
        var sub = value.slice(0, blockLength),
          sub0 = sub.slice(0, 1),
          rest = value.slice(blockLength); // contents of value after our block

        switch (owner.dateTimePattern[index]) {
          case "d": //day of month
            if (sub === "00") {
              sub = "01";
            } else if (parseInt(sub0, 10) > 3) {
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > 31) {
              sub = "31";
            }

            break;

          case "M": // month
            if (sub === "00") {
              sub = "01";
            } else if (parseInt(sub0, 10) > 1) {
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > 12) {
              sub = "12";
            }

            break;

          case "h": // hour
            if (parseInt(sub0, 10) > timeFormatOptions.maxHourFirstDigit) {
              rest = sub.length > 1 ? sub.slice(1) + rest : rest;
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > timeFormatOptions.maxHours) {
              sub = timeFormatOptions.maxHours + "";
            }

            break;

          case "m": // minute
          case "s": // second
            if (parseInt(sub0, 10) > timeFormatOptions.maxMinutesFirstDigit) {
              rest = sub.length > 1 ? sub.slice(1) + rest : rest;
              sub = "0" + sub0;
            } else if (parseInt(sub, 10) > timeFormatOptions.maxMinutes) {
              sub = timeFormatOptions.maxMinutes + "";
            }
            break;
        }

        result += sub;

        // update remaining string
        value = rest;
      }
    });

    return this.getFixedDateTimeString(result);
  },

  getFixedDateTimeString: function(value) {
    var owner = this,
      dateTimePattern = owner.dateTimePattern,
      date = {},
      fixedDate = null,
      blocks = [],
      fullYearDone = false;

    dateTimePattern.forEach(function(type, index) {
      switch (type) {
        case "d":
        case "M":
        case "h":
        case "m":
        case "s":
          blocks.push({
            part: type,
            blockIndex: index,
            inputLength: 2,
            value: null
          });
          break;
        case "Y": // 4 digit year
        case "y": // 2 digit year
          blocks.push({
            part: type,
            blockIndex: index,
            inputLength: type === "Y" ? 4 : 2,
            value: null
          });
          break;
      }
    });

    blocks.forEach(function(block) {
      if (value.length === 0) return block;
      var str = value.slice(0, block.inputLength);
      var int = parseInt(str, 10);
      if (!isNaN(int)) {
        block.value = parseInt(str, 10);
        value = value.slice(block.inputLength);
      }
    });
    /*value = blocks.reduce(function(previous, block) {
      return previous.slice(block.inputLength); // reduce value by the length we just took
    }, value);*/

    var findPart = function(blocks, parts) {
      if (!Array.isArray(parts)) parts = [parts];
      return blocks
        .filter(function(block) {
          return parts.indexOf(block.part) >= 0;
        })
        .map(function(block) {
          return block.value;
        })
        .shift(); // returns undefined if not found
    };

    /// return an array (sorted) featuring block part and the date value [{part:, value:}]
    var datePartsBlockOrder = function(blocks, fixedDate, fullYearDone) {
      return blocks.map(function(block) {
        switch (block.part) {
          case "Y":
          case "y":
            return owner.zpad(fixedDate.year, block.inputLength);
            break;
          case "M":
            return owner.zpad(fixedDate.month, block.inputLength);
            break;
          case "d":
            return owner.zpad(fixedDate.day, block.inputLength);
            break;
          case "h":
            return owner.zpad(fixedDate.hour, block.inputLength);
            break;
          case "m":
            return owner.zpad(fixedDate.minute, block.inputLength);
            break;
          case "s":
            return owner.zpad(fixedDate.second, block.inputLength);
            break;
        }
      });
    };

    date = {
      year: findPart(blocks, ["y", "Y"]),
      month: findPart(blocks, "M"),
      day: findPart(blocks, "d"),
      hour: findPart(blocks, "h"),
      minute: findPart(blocks, "m"),
      second: findPart(blocks, "s")
    };
    // find year block and see if the value matches expected length
    fullYearDone = blocks
      .filter(function(block) {
        return ["Y", "y"].indexOf(block.part) >= 0;
      })
      .map(function(block) {
        return block.value == block.length;
      })
      .shift(); // returns undefined if not found;
    fullYearDone = fullYearDone ? fullYearDone : false;

    fixedDate = this.getFixedDate(
      date.year,
      date.month,
      date.day,
      date.hour,
      date.minute,
      date.second
    );

    fixedDate = owner.getRangeFixedDate(fixedDate);
    owner.datetime = fixedDate;
    var self = this;
    // issue here. We fix the fixed, bounded date, but then return back to our blocks to build the string
    var result =
      fixedDate.length === 0
        ? value
        : datePartsBlockOrder(blocks, fixedDate, fullYearDone).reduce(function(
            previous,
            datePartValue
          ) {
            return (
              previous + (datePartValue != null ? datePartValue.toString() : "")
            );
          },
          "");
    /*: blocks.reduce(function(previous, block) {
            return previous + (block.value != null)
              ? self.zpad(block.value, block.inputLength)
              : "";
          }, "");*/
    return result;
  },
  zpad: function(number, targetLength) {
    if (typeof number == "undefined" || number === null || number === "") {
      return number;
    }
    var str = number.toString();
    if (str.length < targetLength) {
      // String.prototype.repeat is not avialable in phantomJS.
      //str = "0".repeat(Math.max(targetLength - str.length, 0)) + str;
      // based on MDN polyfill for String.prototype.repeat
      var count = Math.floor(Math.log(targetLength - str.length) / Math.log(2));
      var zstr = "0";
      while (count) {
        zstr += zstr;
        count--;
      }

      str =
        zstr + zstr.substring(0, targetLength - str.length - zstr.length) + str;
    }
    return str;
  },

  getRangeFixedDate: function(date) {
    /* min max date part indexes
	0: day
	1: month
	2: year
	*/
    var owner = this,
      dateTimePattern = owner.dateTimePattern,
      dateMin = owner.dateMin || [],
      dateMax = owner.dateMax || [];

    if (!date || (isNaN(date.year) && isNaN(date.month) && isNaN(date.day)))
      return date;
    if (dateMin.length < 3 && dateMax.length < 3) return date;

    if (
      dateTimePattern.filter(function(x) {
        return ["Y", "y"].indexOf(x.toLowerCase()) >= 0;
      }).length > 0 &&
      date.year === 0
    )
      return date;

    var dateArrayToObj = function(dateArray) {
      return {
        year: dateArray[2],
        month: dateArray[1],
        day: dateArray[0],
        hour: date.hour,
        minute: date.minute,
        second: date.second,
        length: dateArray.length
      };
    };
    dateMax = dateArrayToObj(dateMax);
    dateMin = dateArrayToObj(dateMin);

    if (
      dateMax.length &&
      (dateMax.year < date.year ||
        (dateMax.year === date.year &&
          (dateMax.month < date.month ||
            (dateMax.month === date.month && dateMax.day < date.day))))
    )
      return dateMax;

    if (
      dateMin.length &&
      (dateMin.year > date.year ||
        (dateMin.year === date.year &&
          (dateMin.month > date.month ||
            (dateMin.month === date.month && dateMin.day > date.day))))
    )
      return dateMin;

    return date;
  },

  getFixedDate: function(year, month, day, hour, minute, second) {
    year = parseInt(year, 10);
    year = isNaN(year) ? null : year;

    month = month ? Math.min(month, 12) : null;
    day = day ? Math.min(day, 31) : null;
    hour = hour || hour === 0 ? Math.min(hour, 24) : null;
    minute = minute || minute === 0 ? Math.min(minute, 59) : null;
    second = second || second === 0 ? Math.min(second, 59) : null;

    if (month && day) {
      if ([1, 3, 5, 7, 8, 10, 12].indexOf(month) >= 0) {
        day = Math.min(day, 31);
      } else if ([4, 6, 9, 11].indexOf(month) >= 0) {
        day = Math.min(day, 30);
      } else if (month == 2) {
        day = Math.min(day, this.isLeapYear(year) ? 29 : 28);
      }
    }
    /*if ((month < 7 && month % 2 === 0) || (month > 8 && month % 2 === 1)) {
      day = Math.min(day, month === 2 ? (this.isLeapYear(year) ? 29 : 28) : 30);
    }*/

    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
      second: second
    };
  },

  isLeapYear: function(year) {
    return (
      (!isNaN(year) && (year % 4 === 0 && year % 100 !== 0)) || year % 400 === 0
    );
  },

  addLeadingZero: function(number) {
    return (number < 10 ? "0" : "") + number;
  },

  addLeadingZeroForYear: function(number, fullYearMode) {
    if (fullYearMode) {
      return (
        (number < 10 ? "000" : number < 100 ? "00" : number < 1000 ? "0" : "") +
        number
      );
    }

    return (number < 10 ? "0" : "") + number;
  }
};

module.exports = DateTimeFormatter;
