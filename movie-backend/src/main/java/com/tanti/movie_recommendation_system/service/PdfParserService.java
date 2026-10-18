package com.tanti.movie_recommendation_system.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import com.tanti.movie_recommendation_system.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

/** STEP 1: PDF bytes -> list of raw "Movie Title: ..." text blocks (split by ---------- lines). */
@Slf4j
@Service
public class PdfParserService {

    public List<String> extractMovieBlocks(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            String text = new PDFTextStripper().getText(doc);
            log.info("PDF parsed: {} pages, {} characters", doc.getNumberOfPages(), text.length());

            List<String> blocks = Arrays.stream(text.split("-{10,}"))
                    .map(String::trim)
                    .filter(b -> !b.isEmpty() && b.contains("Movie Title"))
                    .toList();

            if (blocks.isEmpty()) {
                throw new BadRequestException(
                        "No movie blocks found. PDF must contain 'Movie Title' entries separated by dashed lines.");
            }
            log.info("Found {} movie blocks", blocks.size());
            return blocks;
        } catch (IOException e) {
            throw new BadRequestException("Could not read PDF: " + e.getMessage());
        }
    }
}
