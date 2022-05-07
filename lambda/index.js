// *****************************************************************************
// Copyright 2019 Amazon.com, Inc. or its affiliates.  All Rights Reserved. 

// You may not use this file except in compliance with the terms and conditions 
// set forth in the accompanying LICENSE.TXT file.

// THESE MATERIALS ARE PROVIDED ON AN "AS IS" BASIS. AMAZON SPECIFICALLY 
// DISCLAIMS, WITH RESPECT TO THESE MATERIALS, ALL WARRANTIES, EXPRESS, IMPLIED, 
// OR STATUTORY, INCLUDING THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS 
// OR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
// *****************************************************************************

const Alexa = require('ask-sdk-core');
const data = require('./PetMatch.json');
const util = require('./util');
const weatherClient = require('./weather-client');

const GetWeatherApiHandler = {
    canHandle(handlerInput) {
        return util.isApiRequest(handlerInput, 'GetWeatherApi');
    },
    handle(handlerInput) {
        const cityNameWithId = util.getCityNameWithIdFromApiRequestSlots(handlerInput);

        if (!cityNameWithId) {
            // We couldn't match this city value to our slot, we'll return empty and let the response template handle it.
            return {apiResponse:{}};
        }

        // "Call a service" to get the weather for this location and date.
        const weather = weatherClient.getWeather(cityNameWithId.id);

        const response = {
            apiResponse: {
                cityName: cityNameWithId.name,
                lowTemperature: weather.lowTemperature,
                highTemperature: weather.highTemperature
            }
        }


        return response;
    }
}

const GetRecommendationAPIHandler = {

    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Dialog.API.Invoked'
            && handlerInput.requestEnvelope.request.apiRequest.name === 'getRecommendation';
    },
    handle(handlerInput) {
        const apiRequest = handlerInput.requestEnvelope.request.apiRequest;

        let energy = resolveEntity(apiRequest.slots, "energy");
        let size = resolveEntity(apiRequest.slots, "size");
        let temperament = resolveEntity(apiRequest.slots, "temperament");

        const recommendationEntity = {};
        if (energy !== null && size !== null && temperament !== null) {
            const key = `${energy}-${size}-${temperament}`;
            const databaseResponse = data[key];

            console.log("Response from mock database ", databaseResponse);

            recommendationEntity.name = databaseResponse.breed;
            recommendationEntity.size = apiRequest.arguments.size
            recommendationEntity.energy = apiRequest.arguments.energy
            recommendationEntity.temperament = apiRequest.arguments.temperament;
        }

        const response = buildSuccessApiResponse(recommendationEntity);
        console.log('GetRecommendationAPIHandler', JSON.stringify(response));

        return response;
    }
};

// *****************************************************************************
// Resolves slot value using Entity Resolution
const resolveEntity = function(resolvedEntity, slot) {

    //This is built in functionality with SDK Using Alexa's ER
    let erAuthorityResolution = resolvedEntity[slot].resolutions
        .resolutionsPerAuthority[0];
    let value = null;

    if (erAuthorityResolution.status.code === 'ER_SUCCESS_MATCH') {
        value = erAuthorityResolution.values[0].value.name;
    }

    return value;
};

const buildSuccessApiResponse = (returnEntity) => {
    return { apiResponse: returnEntity };
};





const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const LightIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
        && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLightIntent';
    },
    handle(handlerInput) {
        //const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = 'Bravo Six Going Dark!'

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};


// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.error(`Error handled: ${error.message}`);
        console.error(`Error stack`, JSON.stringify(error.stack));
        console.error(`Error`, JSON.stringify(error));

        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// *****************************************************************************
// These simple interceptors just log the incoming and outgoing request bodies to assist in debugging.

const LogRequestInterceptor = {
    process(handlerInput) {
        console.log(`REQUEST ENVELOPE = ${JSON.stringify(handlerInput.requestEnvelope)}`);
    },
};

const LogResponseInterceptor = {
    process(handlerInput, response) {
        console.log(`RESPONSE = ${JSON.stringify(response)}`);
    },
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        GetWeatherApiHandler,
        GetRecommendationAPIHandler,
        LightIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(LogRequestInterceptor)
    .addResponseInterceptors(LogResponseInterceptor)
    .lambda();