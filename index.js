/**
 * @author Aleksandros Profka <@github.com/aprofka>
 * @description This application scans alerts from a specified discord alert channel and would use that to try and 
 * auto buy. On load of the application it would login to the specified amazon's given such as amazon.co.uk, amazon.fr and etc.
 * 
 * There are part of this code taken from other projects, but as I did this ages ago, I do not remember from where and/or who.
 * You would have to adjust this so it work for your use case, so it likely wont work out of the box but at least it might help someone.
 * Please also check the config.json file for further "settings" to adjust.
 */

require("dotenv").config();

const replace = require('replace');
const open = require("open");
const winston = require("winston");
const discord = require("discord.js");
const client = new discord.Client({ _tokenType: "User" });
const config = require("./config.json");
const {Builder, By, Key, util, until, Capabilities} = require("selenium-webdriver")

const AMAZON_LOGIN = ["amazon.co.uk/login,amazon.tr/loginPageLink"]; //Here you would add links to all the amazon login mages you would like to use
const USERNAME = "username";
const PASSOWRD = "passowrd";

async function seleniumStart(){
  //Setting chrome options
  let chromeCapabilities = Capabilities.chrome();
  chromeCapabilities.set("goog:chromeOptions", {
    args: [
        "--window-size=1920,1200",
        "--ignore-certificate-errors",
        "--no-sandbox",
        "--disable-gpu",
        "--disable-extensions",
        "disable-infobars"
    ],
    "prefs": {
      "profile.managed_default_content_settings.images": 2
    }
  });


  let driver = await new Builder()
    .forBrowser("chrome")
    .withCapabilities(chromeCapabilities)
    .build();
  await driver.get("http://google.co.uk");

  //Auto-Log in 
  var i;
  for (i = 0; i < AMAZON_LOGIN.length; i++) { 
    await driver.get(AMAZON_LOGIN[i]);
    await new Promise(r => setTimeout(r, 1000));
    await driver.findElement(By.id("ap_email")).sendKeys(USERNAME);
    await new Promise(r => setTimeout(r, 1000));
    await driver.findElement(By.id("continue")).click();
    await new Promise(r => setTimeout(r, 1000));
    await driver.findElement(By.id("ap_password")).sendKeys(PASSOWRD);
    await new Promise(r => setTimeout(r, 1000));
    await driver.findElement(By.name("rememberMe")).click();
    await new Promise(r => setTimeout(r, 1000));
    await driver.findElement(By.id("signInSubmit")).click();
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("Auto login succesfull");

  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      // - Write all logs to console.
      new winston.transports.Console(),
      // - Write all logs error (and below) to `error.log`.
      new winston.transports.File({ filename: "error.log", level: "error" }),
      // - Write to all logs with level `info` and below to `combined.log`
      new winston.transports.File({ filename: "combined.log" })
    ]
  });

  const matchUrls = text => {
    const urls = text.match(
      /((?:(?:http?|ftp):\/\/)?[\w/\-?=%.]+)/g
    );

    if (urls) {
      return urls;
    } else {
      return [];
    }
  };

  

  client.on("ready", () => {
    logger.info(`Ready to open link as ${client.user.tag}`);
  });

  client.on("message", message => {
    if (config.channelIds && config.channelIds.length > 0 && !config.channelIds.includes(message.channel.id)) return;

    message.embeds.forEach((embed) => {
      embed.fields.forEach((field) => {
        const urls = new Set(matchUrls(field.value))

        urls.forEach(async url => {
          if (
            config.keywords.some(keyword =>
              url.toLowerCase().includes(keyword.toLowerCase())
            ) &&
            !config.negativeKeywords.some(
              keyword => keyword && url.toLowerCase().includes(keyword.toLowerCase())
            )
          ) {
            var retryCount = 0;

            async function retryFunc(msg){
              console.log("[",retryCount,"]",msg);
              retryCount++;
              await new Promise(r => setTimeout(r, 1250));
              pageOpen();
            }

            console.log(`\n Opening ${url} \n`);

            async function dupOrder(){
              try{
                await driver.wait(until.elementLocated(By.name("forcePlaceOrder")),3000).click();
                console.log("Dublicate Order attemted \n");
              }catch (e){
                try{
                  await driver.wait(until.elementLocated(By.name("placeYourOrder")),1000).click();
                }catch (e){
                  console.log("Dublicate Order didin't occur \n");
                }  
              }
            }

            async function buyNow(){
              try{
                await driver.wait(until.ableToSwitchToFrame(By.id("turbo-checkout-iframe")),2000);
                await new Promise(r => setTimeout(r, 250));
                try{
                  await driver.wait(until.elementLocated(By.id("turbo-checkout-pyo-button")),2000).click();
                  console.log("Turbo Button found and purchase attempt made \n");
                  dupOrder();
                }catch (e){
                  console.log("Turbo Checkout Button Wasn't Available \n");
                }
              }catch (e){
                try{
                  await driver.wait(until.elementLocated(By.name("placeYourOrder1")),3000).click();
                  console.log("Full Checkout found and purchase attempt made \n");
                }catch (e){
                  console.log("Full Checkout wasn't available \n");
                } 
              }
            }

            async function pageOpen(){
              var sellerInfo = "N/A";
              await driver.get(url);
              await driver.wait(until.elementLocated(By.id("url")),3000).click();

              try {
                var buyNowTitle = await driver.findElement(By.id("title")).getText();
              } catch (e) {
                var buyNowTitle =  "N/A";
              }

              try {
                var txt = await driver.findElement(By.id("price_inside_buybox")).getText();
                var priceInt = txt.toString().match(/([\d,.]+)/g)[0];
              }catch (e) {
                try {
                  var txt = await driver.findElement(By.id("priceblock_ourprice")).getText();
                  var priceInt = txt.toString().match(/([\d,.]+)/g)[0];
                } catch (e){
                  var priceInt = 99999;
                }
              }

              try {
                var sellerInfo = await driver.findElement(By.id("merchant-info")).getText();
              }catch (e){
                var sellerInfo = "N/A";
              }
              
              if(sellerInfo.search("Amazon") != -1){
                if(sellerInfo.search("US") == -1){
                  try{
                    await driver.wait(until.elementLocated(By.id("buy-now-button")),1500).click();
                    if((buyNowTitle.search("3070") != -1) && (priceInt < 910)){
                      buyNow();
                    }else if((buyNowTitle.search("3080") != -1) && (priceInt < 1401)){
                      buyNow();
                    }else if((buyNowTitle.search("3060") != -1) && (priceInt < 826)){
                      buyNow();
                    }else{
                      if(retryCount != 10){
                        retryFunc("Price is too high, page refresh... ");
                        return;
                      } 
                    }
                  }catch (e){
                    if(retryCount != 10){
                      retryFunc("Buy Now button wasnt't available, page refresh...");
                      return;
                    }  
                  }
                }else{
                  if(retryCount != 10){
                    console.log("\n Seller info: ", sellerInfo);
                    retryFunc("Seller was Amazon US, page refresh... ");
                    return;
                  }
                }
              }else{
                if(retryCount != 10){
                  console.log("\n Seller info: ", sellerInfo)
                  retryFunc("Seller wasn't Amazon, page refresh... ");
                  return;
                }   
              }

              retryCount = 0;

              if(priceInt == 99999){
                priceInt = "N/A";
              }

              console.log("Seller info: ", sellerInfo, "    Price: ", priceInt);
              console.log("Product title: ", buyNowTitle);
              console.log("---------------------------------------------------------- \n");
            }
            pageOpen(); 
          }
        });
      });
    });
  });
  client.login(process.env.DISCORD_TOKEN);
}
seleniumStart();