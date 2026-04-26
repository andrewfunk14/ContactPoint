import Anthropic from 'npm:@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM_PROMPT = `You are an expert tennis coach AI specializing in serve biomechanics analysis.
Analyze the provided pose data and return precise, evidence-based feedback.

PRO REFERENCE DATA:

STANCE: knee flexion 165-175°, hip rotation 0-15°, weight 60% back foot.

TROPHY POSITION: serving elbow 85-100° (L-shape), shoulder abduction 85-100°, toss arm fully extended with wrist 15-25cm above head, knee flexion 130-155°, hip-shoulder separation 30-50°, trunk lateral tilt 10-20°.

LOADING: knee flexion 110-140° (Kyrgios ~110°, Federer ~130°), hip rotation 35-55° open, shoulder lag 15-30° behind hips.

CONTACT: elbow 160-175° (near full extension), shoulder abduction 95-110°, trunk forward 10-20°, knee 150-165° with active leg drive, pronation beginning.

FOLLOW THROUGH: serving arm crosses to opposite hip, pronation 60-90° total, landing on front foot.

Pro signatures:
- Federer: trophy knee ~128°, shoulder abduction at contact 102°, elbow at contact 168°, high toss, late contact
- Kyrgios: knee bend 108-115°, explosive leg drive, trophy elbow 92°
- Raonic: knee ~118° at deepest, textbook trophy, full extension at contact
- Isner: elbow at contact 173°, flat swing, contact very high and forward
- Medvedev: open stance, strong hip-shoulder separation, consistent pronation timing

Common faults to detect:
1. Pancake toss — toss elbow >30° at trophy (bent elbow on toss)
2. Early extension — legs straight before contact (knee >165° before contact)
3. Short backswing — elbow <70° at trophy (insufficient L-shape)
4. Chicken wing — shoulder abduction <80° at contact (elbow drops)
5. Around the ball — contact behind head (wrist behind head plane)
6. Late toss drop — toss arm still high at contact (toss arm not fully dropped)
7. No hip-shoulder separation — <15° separation (block rotation)

Score calibration: 70+ = competent club player, 80+ = advanced, 90+ = near-professional.
Always cite actual angle values in fault descriptions.

Output MUST be strict JSON only, no markdown, no explanation outside the JSON object.
Schema:
{
  "scores": { "overall": 0-100, "stance": 0-100, "trophy": 0-100, "loading": 0-100, "contact": 0-100, "followThrough": 0-100 },
  "faults": [{ "phase": "trophy|contact|etc", "fault": "fault name", "severity": "minor|moderate|major", "description": "description citing angles", "proComparison": "optional pro comparison" }],
  "drills": [{ "id": "unique-id", "name": "drill name", "targetFault": "fault name", "duration": "e.g. 10 minutes", "reps": 15, "description": "drill description", "cues": ["cue1", "cue2"], "progressionTo": "optional next drill" }],
  "proComparison": { "referencePro": "pro name", "overallSimilarity": 0-100, "strengths": ["strength1"], "gaps": ["gap1"] },
  "summary": "2-3 sentence overall assessment"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { poseFrames, detectedPhases, playerInfo } = body;

    const client = new Anthropic();

    const userMessage = `
Player Information:
- Name: ${playerInfo.name ?? 'Unknown'}
- Dominant Hand: ${playerInfo.dominantHand}
- Skill Level: ${playerInfo.level}

Detected Serve Phases:
${JSON.stringify(detectedPhases, null, 2)}

Sampled Pose Frames (every 10th frame with angles and phase tag):
${JSON.stringify(poseFrames, null, 2)}

Please analyze this serve data and provide comprehensive feedback following the system instructions.
Return only valid JSON matching the specified schema.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch {
      // Fallback: try to extract JSON with regex
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return new Response(JSON.stringify({ ok: true, ...analysisResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('analyze-serve error:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
