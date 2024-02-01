#include <drogon/drogon.h>
#include <juce_core/juce_core.h>

#include <iostream>
#include <random>
#include <sstream>
#include <utility>


using namespace drogon;


std::stringstream makeStream()
{
	std::stringstream ss;
	ss << std::hex << std::setfill('0');
	return ss;
}

std::string randomKey()
{
	static std::random_device rd;
	static std::mt19937 gen(rd());
	static std::stringstream ss = makeStream();
	std::uniform_int_distribution dist{0, 255};
	ss.str("");
	for (int i = 0; i < 16; i++) {
		ss << std::setw(2) << dist(gen);
	}
	return ss.str();
}

void logRequest(const HttpRequestPtr& req)
{
	auto q = req->getQuery();
	LOG_INFO << req->getMethodString() << " - " << req->getPeerAddr().toIp() << " - " << req->getOriginalPath()
			 << (q.empty() ? "" : "?" + q);
}

bool checkFileExists(const char* s)
{
	if (FILE* f = fopen(s, "r")) {
		fclose(f);
		return true;
	}
	return false;
}

juce::Result extractScore(juce::File& mscx, const std::string& score)
{
	// Unzip the contents of the mscz and return the mscx file.

	juce::File mscz{score};
	juce::ZipFile msczZip{mscz};

	// We'll unzip the .mscz file to a temporary directory next to the score.
	juce::File unzipDirectory = mscz.getParentDirectory().getChildFile("tmp");
	if (auto res = unzipDirectory.createDirectory(); !res)
		return res;
	if (auto res = msczZip.uncompressTo(unzipDirectory); !res)
		return res;

	// Find the mscx file.
	for (int i = 0; i < msczZip.getNumEntries(); i++) {
		juce::File file = unzipDirectory.getChildFile(msczZip.getEntry(i)->filename);
		if (file.existsAsFile() && file.getFileExtension() == ".mscx") {
			mscx = file;
		}
	}

	if (mscx == juce::File{})
		return juce::Result::fail("no mscx found in mscz");

	return juce::Result::ok();
}

juce::Result getMetadata(std::vector<std::pair<juce::String, juce::String>>& data, const juce::File& mscx)
{
	// Read the XML, extract metadata, and return an ordered array of key-pair values.
	std::unique_ptr<juce::XmlElement> msRoot = juce::parseXML(mscx);
	if (!msRoot)
		return juce::Result::fail("failed to parse xml");

	if (juce::XmlElement* score = msRoot->getChildByName("Score"); !score) {
		return juce::Result::fail("no Score element in xml");
	} else {
		for (juce::XmlElement* meta : score->getChildWithTagNameIterator("metaTag")) {
			data.emplace_back(meta->getAttributeValue(0), meta->getAllSubText());
		}
	}

	return juce::Result::ok();
}

void writeOutputFor(const std::string& score, const std::string& output)
{
	juce::File outputFile = juce::File{score}.getSiblingFile("out.txt");
	outputFile.create();
	outputFile.replaceWithText(output);
}

void processScore(const std::string& score)
{
	// To keep this playground simple, we'll just gather some basic data about the score.
	juce::File mscx;
	if (auto res = extractScore(mscx, score); !res) {
		writeOutputFor(score, res.getErrorMessage().toStdString());
		return;
	}

	std::vector<std::pair<juce::String, juce::String>> metadata;
	if (auto res = getMetadata(metadata, mscx); !res) {
		writeOutputFor(score, res.getErrorMessage().toStdString());
		return;
	}

	std::stringstream ss;
	for (const auto& [k, v] : metadata) {
		ss << k << ": " << v << std::endl;
	}
	writeOutputFor(score, ss.str());
}


int main()
{
	app().loadConfigFile("config.json");

	// app().registerHandler("/", [](const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
	// 	logRequest(req);
	// 	auto resp = HttpResponse::newHttpViewResponse("upload");
	// 	callback(resp);
	// });

	app().registerHandler("/upload",
						  [&](const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
							  logRequest(req);

							  MultiPartParser fileUpload;
							  if (fileUpload.parse(req) != 0 || fileUpload.getFiles().size() != 1)
							  {
								  auto resp = HttpResponse::newHttpResponse();
								  resp->setBody("Expected a .mscz file.");
								  resp->setStatusCode(k403Forbidden);
								  callback(resp);
								  return;
							  }

							  // Generate a random key and return it.
							  auto key = randomKey();
							  auto resp = HttpResponse::newHttpResponse();
							  resp->setBody(key);
							  resp->setStatusCode(k200OK);
							  callback(resp);

							  // Now save the file...
							  auto score = fileUpload.getFiles()[0];
							  auto scorePath = app().getUploadPath() + "/" + key + "/score.mscz";
							  LOG_INFO << "saving files to " << scorePath;
							  score.saveAs(scorePath);

							  // ...and process it.
							  processScore(scorePath);
						  },
						  {Post});

	app().registerHandler(
		"/info?id={}",
		[&](const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, const std::string& key) {
			logRequest(req);

			auto file = app().getUploadPath() + "/" + key + "/out.txt";

			if (checkFileExists(file.c_str())) {
				auto resp = HttpResponse::newFileResponse(file, "", CT_TEXT_PLAIN);
				callback(resp);
			} else {
				auto resp = HttpResponse::newHttpResponse();
				resp->setStatusCode(k404NotFound);
				callback(resp);
			}
		});

	LOG_INFO << "running webserver...";
	app().run();
}